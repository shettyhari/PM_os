import { Router } from "express";
import { db } from "@workspace/db";
import { campaignsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.userId, userId));

    const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCtr =
      campaigns.length > 0
        ? campaigns.reduce((s, c) => s + (c.ctr || 0), 0) / campaigns.length
        : 0;

    const platformMap: Record<
      string,
      { platform: string; spend: number; leads: number; revenue: number; ctr: number; cpc: number; color: string }
    > = {
      google: { platform: "google", spend: 0, leads: 0, revenue: 0, ctr: 0, cpc: 0, color: "#4285F4" },
      meta: { platform: "meta", spend: 0, leads: 0, revenue: 0, ctr: 0, cpc: 0, color: "#0082FB" },
      linkedin: { platform: "linkedin", spend: 0, leads: 0, revenue: 0, ctr: 0, cpc: 0, color: "#0A66C2" },
      microsoft: { platform: "microsoft", spend: 0, leads: 0, revenue: 0, ctr: 0, cpc: 0, color: "#00A4EF" },
    };

    for (const c of campaigns) {
      if (platformMap[c.platform]) {
        platformMap[c.platform].spend += c.spend || 0;
        platformMap[c.platform].leads += c.leads || 0;
        platformMap[c.platform].revenue += c.revenue || 0;
        platformMap[c.platform].ctr += c.ctr || 0;
        platformMap[c.platform].cpc += c.cpc || 0;
      }
    }

    const platforms = Object.values(platformMap).map((p) => {
      const count = campaigns.filter((c) => c.platform === p.platform).length || 1;
      return {
        ...p,
        roas: p.spend > 0 ? p.revenue / p.spend : 0,
        cpa: p.leads > 0 ? p.spend / p.leads : 0,
        ctr: p.ctr / count,
        cpc: p.cpc / count,
      };
    });

    // Derive insights from real data
    const needsAttention = campaigns
      .filter((c) => (c.roas || 0) < 1.5 && (c.spend || 0) > 1000)
      .slice(0, 3)
      .map((c) => ({
        id: `na-${c.id}`,
        type: "warning",
        title: `${c.name} — Low ROAS`,
        description: `ROAS is ${(c.roas || 0).toFixed(1)}x — below break-even. Review targeting and creatives.`,
        severity: (c.roas || 0) < 0.5 ? "critical" : "high",
        campaignId: c.id,
        metric: "ROAS",
        value: c.roas || 0,
        action: "Review campaign",
      }));

    const opportunities = campaigns
      .filter((c) => (c.roas || 0) > 4 && c.status === "active")
      .slice(0, 2)
      .map((c) => ({
        id: `op-${c.id}`,
        type: "opportunity",
        title: `Scale ${c.name}`,
        description: `ROAS ${(c.roas || 0).toFixed(1)}x — strong performance. Increasing budget could yield more conversions.`,
        severity: "high",
        campaignId: c.id,
        metric: "ROAS",
        value: c.roas || 0,
        action: "Increase budget",
      }));

    const topPerformers = [...campaigns]
      .sort((a, b) => (b.roas || 0) - (a.roas || 0))
      .slice(0, 2)
      .map((c) => ({
        id: `tp-${c.id}`,
        type: "success",
        title: c.name,
        description: `ROAS ${(c.roas || 0).toFixed(1)}x, ${c.leads} leads at ${(c.cpa || 0).toFixed(0)} CPL.`,
        severity: "low",
        campaignId: c.id,
        metric: "ROAS",
        value: c.roas || 0,
        action: "View campaign",
      }));

    const aiSummary =
      campaigns.length === 0
        ? "No campaign data yet. Connect your ad platforms from the Integrations page to see AI-powered insights here."
        : `Portfolio ROAS: ${avgRoas.toFixed(1)}x across ${campaigns.length} active campaigns. ` +
          (totalLeads > 0 ? `${totalLeads} leads at avg CPL of ${avgCpl.toFixed(0)}. ` : "") +
          (needsAttention.length > 0
            ? `${needsAttention.length} campaign(s) need attention. `
            : "All campaigns performing within targets. ") +
          (opportunities.length > 0 ? `${opportunities.length} scaling opportunity detected.` : "");

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
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/kpis", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.userId, userId));

    const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCtr =
      campaigns.length > 0
        ? campaigns.reduce((s, c) => s + (c.ctr || 0), 0) / campaigns.length
        : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

    const spark = (base: number) =>
      Array.from({ length: 7 }, () => base * (0.75 + Math.random() * 0.5));

    res.json([
      { id: "spend", label: "Total Spend", value: totalSpend, unit: "₹", trend: "up" as const, trendValue: 0, sparkline: spark(totalSpend / 7), description: "Last 30 days" },
      { id: "revenue", label: "Total Revenue", value: totalRevenue, unit: "₹", trend: "up" as const, trendValue: 0, sparkline: spark(totalRevenue / 7), description: "Attributed revenue" },
      { id: "roas", label: "ROAS", value: Number(avgRoas.toFixed(1)), unit: "x", trend: "up" as const, trendValue: 0, sparkline: spark(avgRoas), description: "Return on ad spend" },
      { id: "leads", label: "Total Leads", value: totalLeads, unit: "", trend: "up" as const, trendValue: 0, sparkline: spark(totalLeads / 7), description: "Qualified leads" },
      { id: "cpl", label: "CPL", value: Number(avgCpl.toFixed(0)), unit: "₹", trend: "down" as const, trendValue: 0, sparkline: spark(avgCpl), description: "Cost per lead" },
      { id: "ctr", label: "CTR", value: Number(avgCtr.toFixed(2)), unit: "%", trend: "up" as const, trendValue: 0, sparkline: spark(avgCtr), description: "Click-through rate" },
      { id: "cpc", label: "CPC", value: Number(avgCpc.toFixed(0)), unit: "₹", trend: "down" as const, trendValue: 0, sparkline: spark(avgCpc), description: "Cost per click" },
      { id: "clicks", label: "Clicks", value: totalClicks, unit: "", trend: "up" as const, trendValue: 0, sparkline: spark(totalClicks / 7), description: "Total clicks" },
    ]);
  } catch (err) {
    req.log.error({ err }, "Failed to get KPIs");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/platform-comparison", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.userId, userId));

    const platformColors: Record<string, string> = {
      google: "#4285F4",
      meta: "#0082FB",
      linkedin: "#0A66C2",
      microsoft: "#00A4EF",
    };

    const platformMap: Record<
      string,
      { platform: string; spend: number; leads: number; revenue: number; ctr: number; cpc: number; count: number }
    > = {};

    for (const c of campaigns) {
      if (!platformMap[c.platform]) {
        platformMap[c.platform] = { platform: c.platform, spend: 0, leads: 0, revenue: 0, ctr: 0, cpc: 0, count: 0 };
      }
      platformMap[c.platform].spend += c.spend || 0;
      platformMap[c.platform].leads += c.leads || 0;
      platformMap[c.platform].revenue += c.revenue || 0;
      platformMap[c.platform].ctr += c.ctr || 0;
      platformMap[c.platform].cpc += c.cpc || 0;
      platformMap[c.platform].count++;
    }

    const result = Object.values(platformMap).map((p) => ({
      platform: p.platform,
      spend: p.spend,
      leads: p.leads,
      revenue: p.revenue,
      roas: p.spend > 0 ? p.revenue / p.spend : 0,
      cpa: p.leads > 0 ? p.spend / p.leads : 0,
      ctr: p.count > 0 ? p.ctr / p.count : 0,
      cpc: p.count > 0 ? p.cpc / p.count : 0,
      color: platformColors[p.platform] ?? "#888",
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get platform comparison");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/spend-trend", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.userId, userId));

    const googleDaily =
      campaigns.filter((c) => c.platform === "google").reduce((s, c) => s + (c.spend || 0), 0) / 30;
    const metaDaily =
      campaigns.filter((c) => c.platform === "meta").reduce((s, c) => s + (c.spend || 0), 0) / 30;
    const linkedinDaily =
      campaigns.filter((c) => c.platform === "linkedin").reduce((s, c) => s + (c.spend || 0), 0) / 30;
    const microsoftDaily =
      campaigns.filter((c) => c.platform === "microsoft").reduce((s, c) => s + (c.spend || 0), 0) / 30;

    const trend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const n = () => 0.7 + Math.random() * 0.6;
      const google = Math.round(googleDaily * n());
      const meta = Math.round(metaDaily * n());
      const linkedin = Math.round(linkedinDaily * n());
      const microsoft = Math.round(microsoftDaily * n());
      return {
        date: date.toISOString().split("T")[0],
        google,
        meta,
        linkedin,
        microsoft,
        total: google + meta + linkedin + microsoft,
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
    const userId = req.session.userId!;
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.userId, userId));

    const needsAttention = campaigns
      .filter((c) => (c.roas || 0) < 1.5 && (c.spend || 0) > 500)
      .slice(0, 3)
      .map((c) => ({
        id: `na-${c.id}`,
        type: "warning",
        title: `${c.name} — Low ROAS`,
        description: `ROAS ${(c.roas || 0).toFixed(1)}x. Consider pausing or adjusting targeting.`,
        severity: (c.roas || 0) < 0.5 ? "critical" : "high",
        campaignId: c.id,
        metric: "ROAS",
        value: c.roas || 0,
        action: "Review campaign",
      }));

    const opportunities = campaigns
      .filter((c) => (c.roas || 0) > 4 && c.status === "active")
      .slice(0, 2)
      .map((c) => ({
        id: `op-${c.id}`,
        type: "opportunity",
        title: `Scale ${c.name}`,
        description: `Strong ROAS of ${(c.roas || 0).toFixed(1)}x — increase budget to capture more volume.`,
        severity: "high",
        campaignId: c.id,
        metric: "ROAS",
        value: c.roas || 0,
        action: "Increase budget",
      }));

    const topPerformers = [...campaigns]
      .sort((a, b) => (b.roas || 0) - (a.roas || 0))
      .slice(0, 2)
      .map((c) => ({
        id: `tp-${c.id}`,
        type: "success",
        title: c.name,
        description: `ROAS ${(c.roas || 0).toFixed(1)}x with ${c.leads} conversions.`,
        severity: "low",
        campaignId: c.id,
        metric: "ROAS",
        value: c.roas || 0,
        action: "View campaign",
      }));

    res.json({ needsAttention, opportunities, topPerformers });
  } catch (err) {
    req.log.error({ err }, "Failed to get AI insights");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
