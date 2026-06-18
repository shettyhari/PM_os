import { Router } from "express";
import { db } from "@workspace/db";
import { windsorConnectionsTable, syncLogsTable, windsorMetricsTable, aiInsightsTable } from "@workspace/db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { fetchWindsorData, validateWindsorKey, WINDSOR_CONNECTORS } from "../services/windsor";

const router = Router();

// ─── Connection Management ────────────────────────────────────────────────────

router.get("/windsor/connection", async (req, res) => {
  try {
    const userId = req.user!.id;
    const [conn] = await db
      .select()
      .from(windsorConnectionsTable)
      .where(eq(windsorConnectionsTable.userId, userId))
      .limit(1);

    if (!conn) return void res.json(null);

    const { apiKey, ...rest } = conn;
    return void res.json({
      ...rest,
      apiKeyMasked: apiKey
        ? `${apiKey.slice(0, 6)}${"•".repeat(Math.max(0, apiKey.length - 10))}${apiKey.slice(-4)}`
        : null,
      createdAt: conn.createdAt.toISOString(),
      updatedAt: conn.updatedAt.toISOString(),
      lastSyncAt: conn.lastSyncAt?.toISOString() ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get Windsor connection");
    return void res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/windsor/connect", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { apiKey } = req.body as { apiKey: string };

    if (!apiKey?.trim()) {
      return void res.status(400).json({ error: "API key is required" });
    }

    const validation = await validateWindsorKey(apiKey.trim());

    const [existing] = await db
      .select({ id: windsorConnectionsTable.id })
      .from(windsorConnectionsTable)
      .where(eq(windsorConnectionsTable.userId, userId))
      .limit(1);

    if (existing) {
      await db
        .update(windsorConnectionsTable)
        .set({
          apiKey: apiKey.trim(),
          status: validation.valid ? "connected" : "error",
          lastSyncError: validation.valid ? null : validation.error,
        })
        .where(eq(windsorConnectionsTable.id, existing.id));
    } else {
      await db.insert(windsorConnectionsTable).values({
        userId,
        apiKey: apiKey.trim(),
        status: validation.valid ? "connected" : "error",
        lastSyncError: validation.valid ? null : validation.error,
      });
    }

    return void res.json({ valid: validation.valid, error: validation.error });
  } catch (err) {
    req.log.error({ err }, "Failed to connect Windsor");
    return void res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/windsor/config", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { syncInterval, autoSync } = req.body as { syncInterval?: number; autoSync?: boolean };

    await db
      .update(windsorConnectionsTable)
      .set({
        ...(syncInterval !== undefined && { syncInterval }),
        ...(autoSync !== undefined && { autoSync }),
      })
      .where(eq(windsorConnectionsTable.userId, userId));

    return void res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update Windsor config");
    return void res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/windsor/connection", async (req, res) => {
  try {
    const userId = req.user!.id;
    await db.delete(windsorConnectionsTable).where(eq(windsorConnectionsTable.userId, userId));
    return void res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to disconnect Windsor");
    return void res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Data Sources ─────────────────────────────────────────────────────────────

router.get("/windsor/sources", (_req, res) => {
  return void res.json(WINDSOR_CONNECTORS);
});

// ─── Sync ─────────────────────────────────────────────────────────────────────

router.post("/windsor/sync", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { connector } = req.body as { connector?: string };

    const [conn] = await db
      .select()
      .from(windsorConnectionsTable)
      .where(and(eq(windsorConnectionsTable.userId, userId), eq(windsorConnectionsTable.status, "connected")))
      .limit(1);

    if (!conn) {
      return void res.status(400).json({ error: "No active Windsor connection. Connect your API key first." });
    }

    const connectorsToSync = connector
      ? WINDSOR_CONNECTORS.filter((c) => c.id === connector)
      : WINDSOR_CONNECTORS.slice(0, 4);

    res.json({ message: "Sync started", connectors: connectorsToSync.map((c) => c.id) });

    // Background sync (fire-and-forget)
    void runSync(conn.id, userId, conn.apiKey, connectorsToSync.map((c) => c.id));
  } catch (err) {
    req.log.error({ err }, "Failed to start sync");
    return void res.status(500).json({ error: "Internal server error" });
  }
});

async function runSync(connectionId: number, userId: string, apiKey: string, connectors: string[]) {
  for (const connector of connectors) {
    const startedAt = Date.now();
    const [log] = await db
      .insert(syncLogsTable)
      .values({ windsorConnectionId: connectionId, userId, status: "running", connector })
      .returning();

    try {
      const { data, error } = await fetchWindsorData(apiKey, connector, 30, 5000);

      if (error && data.length === 0) {
        await db
          .update(syncLogsTable)
          .set({ status: "error", errorMessage: error, durationMs: Date.now() - startedAt })
          .where(eq(syncLogsTable.id, log.id));
        continue;
      }

      if (data.length > 0) {
        await db
          .delete(windsorMetricsTable)
          .where(and(eq(windsorMetricsTable.userId, userId), eq(windsorMetricsTable.connector, connector)));

        const rows = data.map((row) => ({
          userId,
          windsorConnectionId: connectionId,
          connector,
          date: String(row.date ?? new Date().toISOString().split("T")[0]),
          accountId: String(row.account_id ?? ""),
          accountName: String(row.account_name ?? ""),
          campaignId: String(row.campaign_id ?? ""),
          campaignName: String(row.campaign_name ?? "Unknown"),
          adsetId: String(row.adset_id ?? ""),
          adsetName: String(row.adset_name ?? ""),
          adId: String(row.ad_id ?? ""),
          adName: String(row.ad_name ?? ""),
          status: String(row.status ?? ""),
          spend: Number(row.spend ?? 0),
          impressions: Number(row.impressions ?? 0),
          clicks: Number(row.clicks ?? 0),
          ctr: Number(row.ctr ?? 0),
          cpc: Number(row.cpc ?? 0),
          cpm: Number(row.cpm ?? 0),
          conversions: Number(row.conversions ?? 0),
          conversionValue: Number(row.conversion_value ?? 0),
          roas: Number(row.roas ?? 0),
          cpa: Number(row.cpa ?? 0),
          reach: Number(row.reach ?? 0),
          leads: Number(row.leads ?? 0),
          revenue: Number(row.revenue ?? row.conversion_value ?? 0),
          rawData: row,
        }));

        for (let i = 0; i < rows.length; i += 500) {
          await db.insert(windsorMetricsTable).values(rows.slice(i, i + 500));
        }
      }

      await db
        .update(syncLogsTable)
        .set({ status: "success", recordsImported: data.length, durationMs: Date.now() - startedAt })
        .where(eq(syncLogsTable.id, log.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await db
        .update(syncLogsTable)
        .set({ status: "error", errorMessage: msg, durationMs: Date.now() - startedAt })
        .where(eq(syncLogsTable.id, log.id));
    }
  }

  await db
    .update(windsorConnectionsTable)
    .set({ lastSyncAt: new Date(), lastSyncStatus: "success" })
    .where(eq(windsorConnectionsTable.id, connectionId));
}

// ─── Sync Logs ────────────────────────────────────────────────────────────────

router.get("/windsor/sync-logs", async (req, res) => {
  try {
    const userId = req.user!.id;
    const logs = await db
      .select()
      .from(syncLogsTable)
      .where(eq(syncLogsTable.userId, userId))
      .orderBy(desc(syncLogsTable.createdAt))
      .limit(50);
    return void res.json(logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get sync logs");
    return void res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Windsor Metrics Query ────────────────────────────────────────────────────

router.get("/windsor/metrics", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { connector, days = "30" } = req.query as { connector?: string; days?: string };

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    const cutoffStr = cutoff.toISOString().split("T")[0]!;

    const metrics = await db
      .select()
      .from(windsorMetricsTable)
      .where(
        and(
          eq(windsorMetricsTable.userId, userId),
          connector ? eq(windsorMetricsTable.connector, connector) : undefined,
          gte(windsorMetricsTable.date, cutoffStr),
        ),
      )
      .orderBy(desc(windsorMetricsTable.date))
      .limit(2000);

    return void res.json(metrics);
  } catch (err) {
    req.log.error({ err }, "Failed to get Windsor metrics");
    return void res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/windsor/summary", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { days = "7" } = req.query as { days?: string };

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(days));
    const cutoffStr = cutoff.toISOString().split("T")[0]!;

    const rows = await db
      .select({
        connector: windsorMetricsTable.connector,
        totalSpend: sql<number>`coalesce(sum(${windsorMetricsTable.spend}), 0)`,
        totalClicks: sql<number>`coalesce(sum(${windsorMetricsTable.clicks}), 0)`,
        totalImpressions: sql<number>`coalesce(sum(${windsorMetricsTable.impressions}), 0)`,
        totalConversions: sql<number>`coalesce(sum(${windsorMetricsTable.conversions}), 0)`,
        totalRevenue: sql<number>`coalesce(sum(${windsorMetricsTable.revenue}), 0)`,
        totalLeads: sql<number>`coalesce(sum(${windsorMetricsTable.leads}), 0)`,
      })
      .from(windsorMetricsTable)
      .where(and(eq(windsorMetricsTable.userId, userId), gte(windsorMetricsTable.date, cutoffStr)))
      .groupBy(windsorMetricsTable.connector);

    const totalSpend = rows.reduce((s, r) => s + Number(r.totalSpend), 0);
    const totalRevenue = rows.reduce((s, r) => s + Number(r.totalRevenue), 0);
    const totalClicks = rows.reduce((s, r) => s + Number(r.totalClicks), 0);
    const totalImpressions = rows.reduce((s, r) => s + Number(r.totalImpressions), 0);
    const totalConversions = rows.reduce((s, r) => s + Number(r.totalConversions), 0);
    const totalLeads = rows.reduce((s, r) => s + Number(r.totalLeads), 0);

    return void res.json({
      byConnector: rows.map((r) => {
        const spend = Number(r.totalSpend);
        const revenue = Number(r.totalRevenue);
        const conversions = Number(r.totalConversions);
        return {
          connector: r.connector,
          totalSpend: spend,
          totalClicks: Number(r.totalClicks),
          totalImpressions: Number(r.totalImpressions),
          totalConversions: conversions,
          totalRevenue: revenue,
          totalLeads: Number(r.totalLeads),
          roas: spend > 0 ? revenue / spend : 0,
          cpa: conversions > 0 ? spend / conversions : 0,
        };
      }),
      totals: {
        spend: totalSpend,
        revenue: totalRevenue,
        clicks: totalClicks,
        conversions: totalConversions,
        leads: totalLeads,
        roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
        cpa: totalConversions > 0 ? totalSpend / totalConversions : 0,
        ctr: totalImpressions > 0 ? totalClicks / totalImpressions : 0,
      },
      days: parseInt(days),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get Windsor summary");
    return void res.status(500).json({ error: "Internal server error" });
  }
});

// ─── AI Insights / Morning Briefing ──────────────────────────────────────────

router.get("/windsor/insights/today", async (req, res) => {
  try {
    const userId = req.user!.id;
    const today = new Date().toISOString().split("T")[0]!;

    const [existing] = await db
      .select()
      .from(aiInsightsTable)
      .where(
        and(
          eq(aiInsightsTable.userId, userId),
          eq(aiInsightsTable.date, today),
          eq(aiInsightsTable.type, "morning_briefing"),
        ),
      )
      .limit(1);

    if (existing) return void res.json({ ...existing, createdAt: existing.createdAt.toISOString() });
    return void res.json(null);
  } catch (err) {
    req.log.error({ err }, "Failed to get today's insight");
    return void res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/windsor/insights/generate", async (req, res) => {
  try {
    const userId = req.user!.id;
    const today = new Date().toISOString().split("T")[0]!;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split("T")[0]!;

    const rows = await db
      .select({
        connector: windsorMetricsTable.connector,
        totalSpend: sql<number>`coalesce(sum(${windsorMetricsTable.spend}), 0)`,
        totalConversions: sql<number>`coalesce(sum(${windsorMetricsTable.conversions}), 0)`,
        totalRevenue: sql<number>`coalesce(sum(${windsorMetricsTable.revenue}), 0)`,
        totalLeads: sql<number>`coalesce(sum(${windsorMetricsTable.leads}), 0)`,
      })
      .from(windsorMetricsTable)
      .where(and(eq(windsorMetricsTable.userId, userId), gte(windsorMetricsTable.date, cutoffStr)))
      .groupBy(windsorMetricsTable.connector);

    const hasData = rows.length > 0;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    let content: string;

    if (!hasData) {
      content = `## ${greeting}! 👋\n\nYour marketing command center is ready. Connect your Windsor.ai API key under **Integrations → Windsor.ai** and run your first data sync to unlock your personalized daily briefing.\n\nOnce connected, I'll automatically analyze your spend, ROAS, leads, and campaign performance across Meta, Google, LinkedIn, and more — every morning.`;
    } else {
      const totalSpend = rows.reduce((s, r) => s + Number(r.totalSpend), 0);
      const totalRevenue = rows.reduce((s, r) => s + Number(r.totalRevenue), 0);
      const totalLeads = rows.reduce((s, r) => s + Number(r.totalLeads), 0);
      const totalConversions = rows.reduce((s, r) => s + Number(r.totalConversions), 0);
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

      const platformLines = rows
        .sort((a, b) => Number(b.totalSpend) - Number(a.totalSpend))
        .map((r) => {
          const spend = Number(r.totalSpend);
          const pct = totalSpend > 0 ? ((spend / totalSpend) * 100).toFixed(0) : "0";
          return `- **${r.connector.replace(/_/g, " ")}**: $${spend.toFixed(0)} spend (${pct}%), ${Number(r.totalLeads)} leads`;
        })
        .join("\n");

      const roasSignal =
        roas < 2
          ? "⚠️ **ROAS below 2x** — review budget allocation on underperforming platforms."
          : roas > 5
            ? "🚀 **Excellent ROAS** — good time to scale top campaigns."
            : "✅ **Healthy ROAS** — look for scaling opportunities.";

      content = `## ${greeting}! Here's your 7-day marketing snapshot 📊\n\n| Metric | Value |\n|---|---|\n| Total Spend | $${totalSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })} |\n| Revenue | $${totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })} |\n| ROAS | ${roas.toFixed(2)}x |\n| Leads | ${totalLeads.toLocaleString()} |\n| Conversions | ${totalConversions.toLocaleString()} |\n\n**By Platform:**\n${platformLines}\n\n${roasSignal}\n\nAsk me anything — "show worst campaigns", "compare platforms", or "where should I cut budget?"`;
    }

    // Upsert today's briefing
    const [existing] = await db
      .select({ id: aiInsightsTable.id })
      .from(aiInsightsTable)
      .where(and(eq(aiInsightsTable.userId, userId), eq(aiInsightsTable.date, today), eq(aiInsightsTable.type, "morning_briefing")))
      .limit(1);

    let saved;
    if (existing) {
      [saved] = await db
        .update(aiInsightsTable)
        .set({ content, metadata: { hasData, rowCount: rows.length } })
        .where(eq(aiInsightsTable.id, existing.id))
        .returning();
    } else {
      [saved] = await db
        .insert(aiInsightsTable)
        .values({ userId, type: "morning_briefing", title: "Daily Marketing Briefing", content, date: today, metadata: { hasData, rowCount: rows.length } })
        .returning();
    }

    return void res.json({ ...saved, createdAt: saved!.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to generate insight");
    return void res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
