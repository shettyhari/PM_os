import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable } from "@workspace/db";
import { eq, desc, count } from "drizzle-orm";

const router = Router();

router.get("/ai/conversations", async (req, res) => {
  try {
    const convos = await db.select().from(conversationsTable).orderBy(desc(conversationsTable.updatedAt));
    const result = await Promise.all(
      convos.map(async (c) => {
        const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, c.id)).orderBy(desc(messagesTable.createdAt)).limit(1);
        const [countResult] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.conversationId, c.id));
        return {
          id: c.id,
          title: c.title,
          createdAt: c.createdAt.toISOString(),
          updatedAt: c.updatedAt.toISOString(),
          messageCount: countResult?.count || 0,
          lastMessage: msgs[0]?.content?.slice(0, 100) || "",
        };
      })
    );
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to list conversations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/conversations", async (req, res) => {
  try {
    const { title } = req.body;
    const [created] = await db.insert(conversationsTable).values({ title: title || "New Conversation" }).returning();
    res.status(201).json({ ...created, createdAt: created.createdAt.toISOString(), updatedAt: created.updatedAt.toISOString(), messageCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create conversation");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ai/conversations/:id/messages", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const msgs = await db.select().from(messagesTable).where(eq(messagesTable.conversationId, id)).orderBy(messagesTable.createdAt);
    res.json(msgs.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), metadata: null })));
  } catch (err) {
    req.log.error({ err }, "Failed to get messages");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/conversations/:id/messages", async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { content } = req.body;

    await db.insert(messagesTable).values({ conversationId, role: "user", content });

    const aiResponse = generateAthenaResponse(content);
    const [saved] = await db.insert(messagesTable).values({ conversationId, role: "assistant", content: aiResponse }).returning();
    await db.update(conversationsTable).set({ updatedAt: new Date() }).where(eq(conversationsTable.id, conversationId));

    res.json({ ...saved, createdAt: saved.createdAt.toISOString(), metadata: null });
  } catch (err) {
    req.log.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/ai/suggested-prompts", async (req, res) => {
  try {
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
  } catch (err) {
    req.log.error({ err }, "Failed to get suggested prompts");
    res.status(500).json({ error: "Internal server error" });
  }
});

function generateAthenaResponse(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes("wasted") || msg.includes("waste")) {
    return `## Wasted Spend Analysis

I've analyzed your campaigns and identified **₹1,24,800** in potential wasted spend across your portfolio.

| Campaign | Platform | Wasted Spend | Reason |
|----------|----------|-------------|--------|
| LinkedIn Brand Awareness | LinkedIn | ₹48,200 | CPA 2.3x above target |
| Meta Cold Audience - Phase 3 | Meta | ₹38,600 | CTR < 0.5%, high frequency |
| Microsoft DSA Campaign | Microsoft | ₹22,000 | Budget exhausted at 2 PM |
| Google Display - Broad | Google | ₹16,000 | Low conversion intent |

**My recommendations:**
1. **Pause** LinkedIn Brand Awareness and reallocate ₹48,200 to LinkedIn Retargeting (ROAS 4.1x)
2. **Refresh creatives** on Meta Cold Audience — current ads have 8.4 frequency
3. **Increase daily budget cap** on Microsoft Search by ₹5,000 to capture evening traffic
4. **Add negative keywords** to Google Display to improve intent quality

Would you like me to generate a detailed optimization plan for any of these campaigns?`;
  }

  if (msg.includes("scale") || msg.includes("increase budget")) {
    return `## Scaling Opportunities — High Confidence

Based on performance data, I've identified **3 campaigns** ready to scale:

### 1. Google Search Brand (ROAS: 7.2x) ⭐ Top Priority
- Current daily budget: ₹12,000 | Recommendation: ₹18,000 (+50%)
- Projected additional leads: **+32/month** at ₹290 CPL
- Budget utilization: 94% — this campaign is budget-constrained

### 2. Meta Retargeting - Website Visitors (ROAS: 4.8x)
- Current daily budget: ₹8,500 | Recommendation: ₹12,000 (+41%)
- Audience size still has room — only 62% audience reached
- Expected CPA: ₹310 (within target)

### 3. Google Search - Non-Brand (ROAS: 3.2x)
- Cautious scale — ₹10,000 → ₹13,500
- Monitor CPA closely — some keywords approaching limit

**Total recommended increase: ₹13,000/day** for projected **₹42,000/day additional revenue**

Want me to draft the budget change requests?`;
  }

  if (msg.includes("report") || msg.includes("weekly") || msg.includes("summary")) {
    return `## Weekly Performance Report — ${new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}

### Executive Summary
This week delivered **138 leads** at an average **CPL of ₹308** — 12% better than the previous week. Total spend was ₹42,530 against a budget of ₹48,000 (88.6% utilization).

### Platform Breakdown

| Platform | Spend | Leads | CPL | ROAS |
|----------|-------|-------|-----|------|
| Google | ₹18,200 | 68 | ₹268 | 6.4x |
| Meta | ₹14,800 | 42 | ₹352 | 4.1x |
| LinkedIn | ₹6,900 | 18 | ₹383 | 2.8x |
| Microsoft | ₹2,630 | 10 | ₹263 | 3.9x |

### Key Highlights
✅ Google Search Brand hit all-time high ROAS of 7.2x on Wednesday
⚠️ LinkedIn CPA increased 18% — audience fatigue likely
📈 Meta Retargeting conversion rate improved to 4.8% (up from 3.2%)

### Next Week Recommendations
1. Reallocate ₹5,000 from LinkedIn to Google Search
2. Refresh LinkedIn creative — current set is 34 days old
3. Test new Meta lookalike audiences based on this week's converters

Shall I export this as a PDF report?`;
  }

  if (msg.includes("meta vs google") || msg.includes("compare")) {
    return `## Meta vs Google — Performance Comparison (Last 30 Days)

| Metric | Google Ads | Meta Ads | Winner |
|--------|-----------|----------|--------|
| Total Spend | ₹5,46,000 | ₹4,44,000 | — |
| Total Leads | 204 | 126 | 🏆 Google |
| CPL | ₹2,676 | ₹3,524 | 🏆 Google |
| ROAS | 6.4x | 4.1x | 🏆 Google |
| CTR | 4.2% | 2.8% | 🏆 Google |
| Impression Share | 68% | N/A | — |
| Frequency | — | 4.2 | — |

### Analysis
**Google Ads** outperforms Meta on lead quality and cost-efficiency. High-intent search traffic converts at 3.1% vs Meta's 1.8%.

**Meta Ads** shines in:
- Brand awareness (2.4M impressions)
- Retargeting efficiency (CPA ₹285 for warm audiences)
- Creative reach for new audience segments

**Recommended strategy:** Use Meta for top-of-funnel awareness → Google Search for bottom-of-funnel conversion capture. Current budget split (55/45) appears optimal.

Want me to model different budget allocation scenarios?`;
  }

  if (msg.includes("predict") || msg.includes("forecast")) {
    return `## Performance Forecast — Next 30 Days

Based on current trends, seasonality patterns, and campaign momentum:

### Projected KPIs

| Metric | Current | Projected | Change |
|--------|---------|-----------|--------|
| Monthly Spend | ₹12.8L | ₹14.2L | +11% |
| Monthly Leads | 414 | 478 | +15.5% |
| CPL | ₹3,092 | ₹2,971 | -3.9% |
| ROAS | 4.8x | 5.1x | +6.3% |
| Revenue | ₹61.4L | ₹72.4L | +17.9% |

### Confidence: 82%

**Assumptions:**
- No major creative fatigue on top performers
- Google Search auction competitiveness stays stable
- Meta algorithm continues to favor video content

**Risk factors:**
- LinkedIn audience saturation could increase CPL by 15-20%
- Competitive pressure on branded keywords (3 new competitors detected)

**Upside scenario:** If you implement my scaling recommendations, leads could reach **520-560** for the month.

Want me to break this down by platform or campaign?`;
  }

  return `## Athena AI Analysis

I've analyzed your marketing data and here's what I found:

**Portfolio Health: Good** ✅

Your overall ROAS of **4.8x** is above the 4x benchmark. You're generating quality leads at ₹308 CPL.

**Key Insights:**
1. **Google Search** is your strongest performer — consider scaling by 20-30%
2. **Meta Retargeting** is highly efficient for warm audiences — duplicate the winning ad set
3. **LinkedIn** needs creative refresh — CPA has been climbing for 2 weeks
4. **Microsoft Ads** is underutilized — budget exhausts before peak hours

**Quick Wins (implement today):**
- Increase Google Search Brand budget by ₹5,000/day → est. +12 leads/week
- Pause 3 underperforming Meta cold audience ad sets → save ₹2,800/day
- Add 15 negative keywords to Google Display → improve CTR by ~0.4%

What would you like to dive deeper into?`;
}

export default router;
