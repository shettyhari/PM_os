import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, userSettingsTable, userMemoryTable, usersTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";

const router = Router();

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getUserGeminiKey(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ geminiApiKey: userSettingsTable.geminiApiKey })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId));
  return row?.geminiApiKey ?? null;
}

async function getUserName(userId: string): Promise<{ firstName: string | null; lastName: string | null }> {
  const [row] = await db
    .select({ firstName: usersTable.firstName, lastName: usersTable.lastName })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return { firstName: row?.firstName ?? null, lastName: row?.lastName ?? null };
}

async function getUserMemories(userId: string): Promise<string[]> {
  const rows = await db
    .select({ memory: userMemoryTable.memory, category: userMemoryTable.category })
    .from(userMemoryTable)
    .where(eq(userMemoryTable.userId, userId))
    .orderBy(desc(userMemoryTable.updatedAt))
    .limit(40);
  return rows.map((r) => `[${r.category}] ${r.memory}`);
}

async function buildGeminiContents(conversationId: number) {
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);
  return msgs.map((m) => ({
    role: m.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: m.content }],
  }));
}

function buildSystemPrompt(firstName: string | null, memories: string[]): string {
  const name = firstName?.trim() || null;
  const greeting = name ? `Your user's name is ${name}. Address them naturally by first name when it feels warm and appropriate — not every single message, but enough to feel personal.` : "";

  const memoryBlock =
    memories.length > 0
      ? `\n\n## What you remember about ${name ?? "this user"}:\n${memories.map((m) => `- ${m}`).join("\n")}\n\nUse these memories naturally — reference past decisions, build on known context, and don't ask for information you already know.`
      : "";

  return `You are Athena — ${name ? `${name}'s` : "the user's"} dedicated AI marketing assistant inside PerformanceOS.

You are NOT a generic AI. You are their personal marketing strategist who knows their business, remembers their campaigns, tracks their goals, and speaks to them like a trusted advisor who has been working with them for months. You have context, opinions, and continuity.
${greeting}

## Your personality:
- Warm, direct, and confident — like a senior marketing partner, not a chatbot
- You remember past conversations and reference them naturally ("Last time we talked about scaling your Meta budget — here's how that's looking…")
- You proactively connect dots across campaigns, platforms, and time periods
- You celebrate wins and flag risks without being alarmist
- You give concrete recommendations, not vague suggestions
- When you don't have data, you ask the one most important question to get it

## Your expertise:
- Campaign performance analysis (ROAS, CPL, CTR, CPA, impressions, conversions)
- Cross-platform strategy: Google Ads, Meta Ads, LinkedIn, Microsoft Ads
- Budget allocation and scaling decisions
- Ad copy and creative strategy
- Forecasting, seasonality, and trend analysis
- Marketing reports and executive summaries
${memoryBlock}

## Response style:
- Use markdown: tables for comparisons, bold for key numbers, headers for sections
- Be concise — lead with the insight, follow with the reasoning
- Always end with one clear next step or a focused follow-up question
- Never pad with generic disclaimers or unnecessary caveats`;
}

// ─── Memory extraction (fire-and-forget) ────────────────────────────────────

async function extractAndSaveMemories(
  ai: GoogleGenAI,
  userId: string,
  userMessage: string,
  assistantResponse: string,
): Promise<void> {
  try {
    const extractionPrompt = `You are a memory extractor. Given a conversation between a marketing assistant and their user, extract any facts worth remembering for future conversations.

User message: "${userMessage}"
Assistant response: "${assistantResponse.slice(0, 2000)}"

Extract 0–4 important facts. Only extract things that are genuinely useful to remember long-term:
- Business type, industry, or niche
- Specific campaigns, ad accounts, or platforms they use
- Budget ranges or financial goals
- Performance problems or goals they've mentioned
- Decisions they've made or strategies they want to pursue
- Personal preferences (reporting style, communication style, priorities)
- Team structure or their role

Respond with a JSON array only, no markdown. Each item: { "category": "business|campaign|goal|preference|decision|problem", "memory": "concise fact in one sentence" }

If there's nothing worth remembering, return [].`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: extractionPrompt }] }],
      config: { maxOutputTokens: 512 },
    });

    const raw = response.text?.trim() ?? "[]";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const extracted = JSON.parse(cleaned) as Array<{ category: string; memory: string }>;

    if (Array.isArray(extracted) && extracted.length > 0) {
      await db.insert(userMemoryTable).values(
        extracted
          .filter((e) => e.memory && typeof e.memory === "string")
          .map((e) => ({
            userId,
            category: e.category || "general",
            memory: e.memory.trim(),
          })),
      );
    }
  } catch {
    // Memory extraction is best-effort — never block the response
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

router.get("/ai/conversations", async (req, res) => {
  try {
    const convos = await db
      .select()
      .from(conversationsTable)
      .orderBy(desc(conversationsTable.updatedAt));
    const result = await Promise.all(
      convos.map(async (c) => {
        const msgs = await db
          .select()
          .from(messagesTable)
          .where(eq(messagesTable.conversationId, c.id))
          .orderBy(desc(messagesTable.createdAt))
          .limit(1);
        const [countResult] = await db
          .select({ count: count() })
          .from(messagesTable)
          .where(eq(messagesTable.conversationId, c.id));
        return {
          id: c.id,
          title: c.title,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          messageCount: countResult?.count || 0,
          lastMessage: msgs[0]?.content?.slice(0, 100) || "",
        };
      }),
    );
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/conversations", async (req, res) => {
  try {
    const { title } = req.body as { title?: string };
    const [created] = await db
      .insert(conversationsTable)
      .values({ title: title || "New Conversation" })
      .returning();
    res.status(201).json({
      ...created,
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
      messageCount: 0,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ai/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const msgs = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.conversationId, id))
      .orderBy(messagesTable.createdAt);
    res.json(msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), metadata: null })));
  } catch (err) {
    req.log.error({ err }, "Failed to get messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Non-streaming endpoint
router.post("/ai/conversations/:id/messages", async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { content } = req.body as { content: string };
    const userId = req.user!.id;

    await db.insert(messagesTable).values({ conversationId, role: "user", content });

    const apiKey = await getUserGeminiKey(userId);
    let aiResponse: string;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const [contents, { firstName }, memories] = await Promise.all([
          buildGeminiContents(conversationId),
          getUserName(userId),
          getUserMemories(userId),
        ]);
        const systemInstruction = buildSystemPrompt(firstName, memories);

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: { maxOutputTokens: 8192, systemInstruction },
        });
        aiResponse = response.text ?? "I couldn't generate a response. Please try again.";

        // Fire-and-forget memory extraction
        void extractAndSaveMemories(ai, userId, content, aiResponse);
      } catch (geminiErr) {
        req.log.error({ geminiErr }, "Gemini API error");
        aiResponse =
          "⚠️ Gemini API error. Please verify your API key in **Dashboard → Settings**. The key should be a valid Google AI Studio key starting with `AIza...`";
      }
    } else {
      aiResponse =
        "⚙️ **Gemini API key not configured.** To enable AI responses, open **Dashboard → Settings** and enter your Google AI Studio API key. You can get a free key at [aistudio.google.com](https://aistudio.google.com).";
    }

    const [saved] = await db
      .insert(messagesTable)
      .values({ conversationId, role: "assistant", content: aiResponse })
      .returning();
    await db
      .update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationsTable.id, conversationId));

    res.json({ ...saved, createdAt: saved.createdAt.toISOString(), metadata: null });
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Streaming endpoint (SSE)
router.post("/ai/conversations/:id/messages/stream", async (req, res) => {
  const conversationId = parseInt(req.params.id);
  const { content } = req.body as { content: string };
  const userId = req.user!.id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  try {
    await db.insert(messagesTable).values({ conversationId, role: "user", content });

    const apiKey = await getUserGeminiKey(userId);

    if (!apiKey) {
      const msg =
        "⚙️ **Gemini API key not configured.** Open **Dashboard → Settings** and enter your Google AI Studio key to enable AI responses.";
      send({ content: msg });
      await db.insert(messagesTable).values({ conversationId, role: "assistant", content: msg });
      await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));
      send({ done: true });
      res.end();
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    // Load user context and conversation history in parallel
    const [contents, { firstName }, memories] = await Promise.all([
      buildGeminiContents(conversationId),
      getUserName(userId),
      getUserMemories(userId),
    ]);
    const systemInstruction = buildSystemPrompt(firstName, memories);

    let fullResponse = "";

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: { maxOutputTokens: 8192, systemInstruction },
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        fullResponse += text;
        send({ content: text });
      }
    }

    await db.insert(messagesTable).values({ conversationId, role: "assistant", content: fullResponse });
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));

    send({ done: true });
    res.end();

    // Extract memories after response is complete (non-blocking)
    void extractAndSaveMemories(ai, userId, content, fullResponse);
  } catch (err) {
    req.log.error({ err }, "Streaming error");
    send({ error: "Gemini API error. Check your API key in Settings." });
    send({ done: true });
    res.end();
  }
});

router.get("/ai/suggested-prompts", async (_req, res) => {
  res.json([
    { id: "p1", text: "Analyze all my campaigns and find quick wins", category: "analyze", icon: "BarChart2" },
    { id: "p2", text: "Where am I wasting budget right now?", category: "optimize", icon: "AlertTriangle" },
    { id: "p3", text: "Give me a weekly performance summary", category: "report", icon: "FileText" },
    { id: "p4", text: "Which campaigns should I scale today?", category: "optimize", icon: "TrendingUp" },
    { id: "p5", text: "Compare my Meta vs Google performance this month", category: "analyze", icon: "ArrowLeftRight" },
    { id: "p6", text: "Predict my leads and ROAS for next month", category: "predict", icon: "Sparkles" },
    { id: "p7", text: "Write 5 fresh ad copy variations for me", category: "report", icon: "PenLine" },
    { id: "p8", text: "What's my biggest opportunity right now?", category: "optimize", icon: "Target" },
  ]);
});

// GET user memories (for settings/debug)
router.get("/ai/memory", async (req, res) => {
  try {
    const userId = req.user!.id;
    const memories = await db
      .select()
      .from(userMemoryTable)
      .where(eq(userMemoryTable.userId, userId))
      .orderBy(desc(userMemoryTable.updatedAt));
    res.json(memories);
  } catch (err) {
    req.log.error({ err }, "Failed to get memories");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE a specific memory
router.delete("/ai/memory/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const memId = parseInt(req.params.id);
    await db.delete(userMemoryTable).where(eq(userMemoryTable.id, memId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete memory");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
