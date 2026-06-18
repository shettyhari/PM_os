import { Router } from "express";
import { db } from "@workspace/db";
import { windsorMetricsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";
import { connectorDisplayName } from "../services/windsor";

const router = Router();

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#0082FB",
  meta: "#0082FB",
  google: "#4285F4",
  linkedin: "#0A66C2",
  microsoft: "#00A4EF",
  tiktok: "#010101",
};

/** Aggregate Windsor metrics from DB for a given user and date cutoff */
async function getWindsorMetrics(userId: string, days: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0]!;

  return db
    .select()
    .from(windsorMetricsTable)
    .where(and(eq(windsorMetricsTable.userId, userId), gte(windsorMetricsTable.date, cutoffStr)));
}

router.get("/dashboard/summary", async (req, res) => {
  try {
    const userId = req.user!.id;
    const metrics = await getWindsorMetrics(userId, 30);

    const totalSpend = metrics.reduce((s, r) => s + (r.spend ?? 0), 0);
    const totalLeads = metrics.reduce((s, r) => s + (r.leads ?? 0), 0);
    const totalRevenue = metrics.reduce((s, r) => s + (r.revenue ?? 0), 0);
    const totalClicks = metrics.reduce((s, r) => s + (r.clicks ?? 0), 0);
    const totalImpressions = metrics.reduce((s, r) => s + (r.impressions ?? 0), 0);
    const totalConversions = metrics.reduce((s, r) => s + (r.conversions ?? 0), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : totalConversions > 0 ? totalSpend / totalConversions : 0;
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

    // Per-platform aggregation
    const platformMap: Record<string, { platform: string; spend: number; leads: number; revenue: number; clicks: number; impressions: number; conversions: number; color: string }> = {};

    for (const r of metrics) {
      const p = r.connector;
      if (!platformMap[p]) {
        platformMap[p] = { platform: p, spend: 0, leads: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0, color: PLATFORM_COLORS[p] ?? "#888" };
      }
      platformMap[p].spend += r.spend ?? 0;
      platformMap[p].leads += r.leads ?? 0;
      platformMap[p].revenue += r.revenue ?? 0;
      platformMap[p].clicks += r.clicks ?? 0;
      platformMap[p].impressions += r.impressions ?? 0;
      platformMap[p].conversions += r.conversions ?? 0;
    }

    const platforms = Object.values(platformMap).map((p) => ({
      platform: p.platform,
      displayName: connectorDisplayName(p.platform),
      spend: p.spend,
      leads: p.leads,
      revenue: p.revenue,
      roas: p.spend > 0 ? p.revenue / p.spend : 0,
      cpa: (p.leads + p.conversions) > 0 ? p.spend / (p.leads + p.conversions) : 0,
      ctr: p.impressions > 0 ? p.clicks / p.impressions : 0,
      cpc: p.clicks > 0 ? p.spend / p.clicks : 0,
      color: p.color,
    }));

    // Campaign-level insights from metrics
    const campaignMap: Record<string, { name: string; platform: string; spend: number; leads: number; revenue: number; conversions: number; clicks: number }> = {};
    for (const r of metrics) {
      const key = `${r.connector}::${r.campaignName}`;
      if (!campaignMap[key]) {
        campaignMap[key] = { name: r.campaignName ?? "Unknown", platform: r.connector, spend: 0, leads: 0, revenue: 0, conversions: 0, clicks: 0 };
      }
      campaignMap[key].spend += r.spend ?? 0;
      campaignMap[key].leads += r.leads ?? 0;
      campaignMap[key].revenue += r.revenue ?? 0;
      campaignMap[key].conversions += r.conversions ?? 0;
      campaignMap[key].clicks += r.clicks ?? 0;
    }

    const campaigns = Object.values(campaignMap).map((c) => ({
      ...c,
      roas: c.spend > 0 ? c.revenue / c.spend : 0,
    }));

    const needsAttention = campaigns
      .filter((c) => c.spend > 5000 && (c.leads + c.conversions) === 0)
      .slice(0, 3)
      .map((c, i) => ({
        id: `na-${i}`,
        type: "warning",
        title: `${c.name} — No Conversions`,
        description: `₹${c.spend.toLocaleString("en-IN", { maximumFractionDigits: 0 })} spent with 0 conversions tracked. Verify conversion setup or pause.`,
        severity: c.spend > 50000 ? "critical" : "high",
        metric: "Conversions",
        value: 0,
        action: "Review campaign",
      }));

    const topBySpend = [...campaigns].sort((a, b) => b.spend - a.spend).slice(0, 2);
    const opportunities = topBySpend.map((c, i) => ({
      id: `op-${i}`,
      type: "opportunity",
      title: `Scale ${c.name}`,
      description: `Top spender at ₹${c.spend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}. Add conversion tracking to measure true ROAS.`,
      severity: "high",
      metric: "Spend",
      value: c.spend,
      action: "Configure tracking",
    }));

    const topPerformers = [...campaigns]
      .filter((c) => c.spend > 1000)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 2)
      .map((c, i) => ({
        id: `tp-${i}`,
        type: "success",
        title: c.name,
        description: `₹${c.spend.toLocaleString("en-IN", { maximumFractionDigits: 0 })} spend, ${c.clicks ?? 0} clicks via ${connectorDisplayName(c.platform)}.`,
        severity: "low",
        metric: "Spend",
        value: c.spend,
        action: "View campaign",
      }));

    const aiSummary =
      metrics.length === 0
        ? "Windsor.ai is connected. Sync your data from the Integrations page to see live AI-powered insights here."
        : `${connectorDisplayName(platforms[0]?.platform ?? "Meta")} portfolio: ₹${totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })} spend across ${campaigns.length} campaigns (last 30 days). ` +
          `${totalClicks.toLocaleString()} clicks at avg CPC of ₹${totalClicks > 0 ? (totalSpend / totalClicks).toFixed(0) : "0"}. ` +
          (needsAttention.length > 0
            ? `${needsAttention.length} campaign(s) need attention — no conversions tracked.`
            : "All campaigns actively spending.");

    res.json({
      totalSpend,
      totalLeads,
      avgRoas,
      avgCpl,
      avgCpa: avgCpl,
      totalRevenue,
      totalClicks,
      avgCtr,
      platforms,
      aiSummary,
      needsAttention,
      opportunities,
      topPerformers,
      period: "last_30_days",
      dataSource: metrics.length > 0 ? "windsor" : "empty",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/kpis", async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get both 30-day and 7-day data for trend calculation
    const [metrics30, metrics7] = await Promise.all([
      getWindsorMetrics(userId, 30),
      getWindsorMetrics(userId, 7),
    ]);

    const agg = (rows: typeof metrics30) => ({
      spend: rows.reduce((s, r) => s + (r.spend ?? 0), 0),
      leads: rows.reduce((s, r) => s + (r.leads ?? 0), 0),
      revenue: rows.reduce((s, r) => s + (r.revenue ?? 0), 0),
      clicks: rows.reduce((s, r) => s + (r.clicks ?? 0), 0),
      impressions: rows.reduce((s, r) => s + (r.impressions ?? 0), 0),
      conversions: rows.reduce((s, r) => s + (r.conversions ?? 0), 0),
    });

    const t30 = agg(metrics30);
    const t7 = agg(metrics7);

    const avgRoas30 = t30.spend > 0 ? t30.revenue / t30.spend : 0;
    const avgCpl30 = (t30.leads + t30.conversions) > 0 ? t30.spend / (t30.leads + t30.conversions) : 0;
    const avgCtr30 = t30.impressions > 0 ? (t30.clicks / t30.impressions) * 100 : 0;
    const avgCpc30 = t30.clicks > 0 ? t30.spend / t30.clicks : 0;

    const trendPct = (curr: number, prev: number): number => {
      if (prev === 0) return 0;
      return Math.round(((curr - prev) / prev) * 100);
    };

    // Build 7-point sparklines from grouped daily spend
    const dailyMap: Record<string, number> = {};
    for (const r of metrics30) {
      const d = r.date ?? "";
      dailyMap[d] = (dailyMap[d] ?? 0) + (r.spend ?? 0);
    }
    const sortedDays = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
    const sparkSpend = sortedDays.slice(-7).length === 7 ? sortedDays.slice(-7) : Array(7).fill(t30.spend / 7);

    const spark = (v: number) => Array(7).fill(0).map((_, i) => v * (0.8 + (i / 7) * 0.4));

    res.json([
      { id: "spend", label: "Total Spend", value: t30.spend, unit: "currency", trend: t7.spend > t30.spend / 4.3 ? "up" : "down", trendValue: trendPct(t7.spend, t30.spend / 4.3), sparkline: sparkSpend, description: "Last 30 days" },
      { id: "revenue", label: "Total Revenue", value: t30.revenue, unit: "currency", trend: "up", trendValue: 0, sparkline: spark(t30.revenue / 7), description: "Attributed revenue" },
      { id: "roas", label: "ROAS", value: Number(avgRoas30.toFixed(2)), unit: "multiplier", trend: "up", trendValue: 0, sparkline: spark(avgRoas30), description: "Return on ad spend" },
      { id: "leads", label: "Leads / Conversions", value: t30.leads + t30.conversions, unit: "number", trend: "up", trendValue: 0, sparkline: spark((t30.leads + t30.conversions) / 7), description: "Total conversions tracked" },
      { id: "cpl", label: "CPL", value: Number(avgCpl30.toFixed(0)), unit: "currency", trend: avgCpl30 > 0 ? "down" : "up", trendValue: 0, sparkline: spark(avgCpl30), description: "Cost per lead/conversion" },
      { id: "ctr", label: "CTR", value: Number(avgCtr30.toFixed(2)), unit: "percentage", trend: "up", trendValue: 0, sparkline: spark(avgCtr30), description: "Click-through rate" },
      { id: "cpc", label: "CPC", value: Number(avgCpc30.toFixed(0)), unit: "currency", trend: "down", trendValue: 0, sparkline: spark(avgCpc30), description: "Cost per click" },
      { id: "clicks", label: "Clicks", value: t30.clicks, unit: "number", trend: "up", trendValue: trendPct(t7.clicks, t30.clicks / 4.3), sparkline: spark(t30.clicks / 7), description: "Total clicks" },
    ]);
  } catch (err) {
    req.log.error({ err }, "Failed to get KPIs");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/platform-comparison", async (req, res) => {
  try {
    const userId = req.user!.id;
    const metrics = await getWindsorMetrics(userId, 30);

    const platformMap: Record<string, { platform: string; spend: number; leads: number; revenue: number; clicks: number; impressions: number; conversions: number }> = {};

    for (const r of metrics) {
      const p = r.connector;
      if (!platformMap[p]) {
        platformMap[p] = { platform: p, spend: 0, leads: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 };
      }
      platformMap[p].spend += r.spend ?? 0;
      platformMap[p].leads += r.leads ?? 0;
      platformMap[p].revenue += r.revenue ?? 0;
      platformMap[p].clicks += r.clicks ?? 0;
      platformMap[p].impressions += r.impressions ?? 0;
      platformMap[p].conversions += r.conversions ?? 0;
    }

    const result = Object.values(platformMap).map((p) => ({
      platform: p.platform,
      displayName: connectorDisplayName(p.platform),
      spend: p.spend,
      leads: p.leads,
      revenue: p.revenue,
      roas: p.spend > 0 ? p.revenue / p.spend : 0,
      cpa: (p.leads + p.conversions) > 0 ? p.spend / (p.leads + p.conversions) : 0,
      ctr: p.impressions > 0 ? p.clicks / p.impressions : 0,
      cpc: p.clicks > 0 ? p.spend / p.clicks : 0,
      color: PLATFORM_COLORS[p.platform] ?? "#888",
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get platform comparison");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/spend-trend", async (req, res) => {
  try {
    const userId = req.user!.id;
    const metrics = await getWindsorMetrics(userId, 30);

    // Group by date × platform
    const byDate: Record<string, Record<string, number>> = {};
    for (const r of metrics) {
      const d = r.date ?? "";
      if (!byDate[d]) byDate[d] = {};
      byDate[d][r.connector] = (byDate[d][r.connector] ?? 0) + (r.spend ?? 0);
    }

    // Fill in last 30 days
    const trend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const d = date.toISOString().split("T")[0]!;
      const row = byDate[d] ?? {};
      const meta = row["facebook"] ?? 0;
      const google = row["google"] ?? 0;
      const linkedin = row["linkedin"] ?? 0;
      const microsoft = row["microsoft"] ?? 0;
      return {
        date: d,
        meta,
        google,
        linkedin,
        microsoft,
        total: meta + google + linkedin + microsoft,
      };
    });

    res.json(trend);
  } catch (err) {
    req.log.error({ err }, "Failed to get spend trend");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/ai-insights", async (req, res) => {
  try {
    const userId = req.user!.id;
    const metrics = await getWindsorMetrics(userId, 30);

    const campaignMap: Record<string, { name: string; platform: string; spend: number; leads: number; revenue: number; conversions: number; clicks: number }> = {};
    for (const r of metrics) {
      const key = `${r.connector}::${r.campaignName}`;
      if (!campaignMap[key]) {
        campaignMap[key] = { name: r.campaignName ?? "Unknown", platform: r.connector, spend: 0, leads: 0, revenue: 0, conversions: 0, clicks: 0 };
      }
      campaignMap[key].spend += r.spend ?? 0;
      campaignMap[key].leads += r.leads ?? 0;
      campaignMap[key].revenue += r.revenue ?? 0;
      campaignMap[key].conversions += r.conversions ?? 0;
      campaignMap[key].clicks += r.clicks ?? 0;
    }

    const campaigns = Object.values(campaignMap);

    const needsAttention = campaigns
      .filter((c) => c.spend > 5000 && (c.leads + c.conversions) === 0)
      .slice(0, 3)
      .map((c, i) => ({
        id: `na-${i}`,
        type: "warning",
        title: `${c.name} — No Conversions`,
        description: `₹${c.spend.toLocaleString("en-IN", { maximumFractionDigits: 0 })} spent with 0 conversions. Add conversion tracking in ${connectorDisplayName(c.platform)}.`,
        severity: c.spend > 50000 ? "critical" : "high",
        metric: "Conversions",
        value: 0,
        action: "Configure tracking",
      }));

    const opportunities = [...campaigns]
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 2)
      .map((c, i) => ({
        id: `op-${i}`,
        type: "opportunity",
        title: `Optimize ${c.name}`,
        description: `${c.clicks.toLocaleString()} clicks at ₹${c.clicks > 0 ? (c.spend / c.clicks).toFixed(0) : "0"} CPC. Adding a landing page conversion goal could unlock ROAS tracking.`,
        severity: "high",
        metric: "Clicks",
        value: c.clicks,
        action: "Add conversion goal",
      }));

    const topPerformers = [...campaigns]
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 2)
      .map((c, i) => ({
        id: `tp-${i}`,
        type: "success",
        title: c.name,
        description: `₹${c.spend.toLocaleString("en-IN", { maximumFractionDigits: 0 })} spend, ${c.clicks.toLocaleString()} clicks via ${connectorDisplayName(c.platform)}.`,
        severity: "low",
        metric: "Spend",
        value: c.spend,
        action: "View campaign",
      }));

    res.json({ needsAttention, opportunities, topPerformers });
  } catch (err) {
    req.log.error({ err }, "Failed to get AI insights");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
