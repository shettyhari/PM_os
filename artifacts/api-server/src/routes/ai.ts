import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, userSettingsTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";

const router = Router();

const ATHENA_SYSTEM_PROMPT = `You are Athena, an expert AI marketing analyst embedded in PerformanceOS — an all-in-one marketing operating system. Help users analyze and optimize campaigns across Google Ads, Meta Ads, LinkedIn, and Microsoft Ads.

Your capabilities:
- Analyze campaign performance (spend, ROAS, CPL, CTR, conversions, impressions)
- Identify optimization opportunities and cost-saving measures
- Forecast performance trends using seasonality and momentum
- Compare cross-platform performance
- Generate structured marketing reports
- Recommend budget allocation and scaling strategies
- Write ad copy variations
- Diagnose underperforming campaigns

Style guidelines:
- Be concise, data-driven, and immediately actionable
- Use markdown: tables, bullet points, bold for key numbers, headers for sections
- When data is not provided, give industry benchmarks and ask what data the user can share
- Always end with a next step or follow-up question`;

async function getUserGeminiKey(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ geminiApiKey: userSettingsTable.geminiApiKey })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId));
  return row?.geminiApiKey ?? null;
}

async function buildGeminiContents(conversationId: number) {
  const msgs = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(messagesTable.createdAt);
  return msgs.map((m) => ({
    role: m.role === "assistant" ? "model" as const : "user" as const,
    parts: [{ text: m.content }],
  }));
}

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

// Non-streaming message endpoint (kept for compatibility)
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
        const contents = await buildGeminiContents(conversationId);
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            maxOutputTokens: 8192,
            systemInstruction: ATHENA_SYSTEM_PROMPT,
          },
        });
        aiResponse = response.text ?? "I couldn't generate a response. Please try again.";
      } catch (geminiErr) {
        req.log.error({ geminiErr }, "Gemini API error");
        aiResponse =
          "⚠️ Gemini API error. Please verify your API key in **Dashboard → Settings**. The key should be a valid Google AI Studio key starting with `AIza...`";
      }
    } else {
      aiResponse =
        "⚙️ **Gemini API key not configured.** To enable AI responses, open **Dashboard → Settings** (gear icon at the top right) and enter your Google AI Studio API key. You can get a free key at [aistudio.google.com](https://aistudio.google.com).";
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

// Streaming message endpoint (SSE)
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
        "⚙️ **Gemini API key not configured.** Open **Dashboard → Settings** (gear icon) and enter your Google AI Studio key to enable AI responses.";
      send({ content: msg });
      await db.insert(messagesTable).values({ conversationId, role: "assistant", content: msg });
      await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));
      send({ done: true });
      res.end();
      return;
    }

    const ai = new GoogleGenAI({ apiKey });
    const contents = await buildGeminiContents(conversationId);

    let fullResponse = "";

    const stream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: {
        maxOutputTokens: 8192,
        systemInstruction: ATHENA_SYSTEM_PROMPT,
      },
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
  } catch (err) {
    req.log.error({ err }, "Streaming error");
    send({ error: "Gemini API error. Check your API key in Settings." });
    send({ done: true });
    res.end();
  }
});

router.get("/ai/suggested-prompts", async (_req, res) => {
  res.json([
    { id: "p1", text: "Analyze all campaigns and identify quick wins", category: "analyze", icon: "BarChart2" },
    { id: "p2", text: "Show me where I'm wasting budget", category: "optimize", icon: "AlertTriangle" },
    { id: "p3", text: "Generate a weekly performance report", category: "report", icon: "FileText" },
    { id: "p4", text: "Which campaigns should I scale today?", category: "optimize", icon: "TrendingUp" },
    { id: "p5", text: "Compare Meta vs Google performance this month", category: "analyze", icon: "ArrowLeftRight" },
    { id: "p6", text: "Predict next month's leads and ROAS", category: "predict", icon: "Sparkles" },
    { id: "p7", text: "Generate 5 Meta ad copy variations", category: "report", icon: "PenLine" },
    { id: "p8", text: "Find campaigns with highest potential for improvement", category: "optimize", icon: "Target" },
  ]);
});

export default router;
