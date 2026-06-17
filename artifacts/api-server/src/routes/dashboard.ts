import { Router } from "express";
import { db } from "@workspace/db";
import { campaignsTable } from "@workspace/db";
import { sql, desc } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  try {
    const campaigns = await db.select().from(campaignsTable);

    const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCpa = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCtr = campaigns.length > 0 ? campaigns.reduce((s, c) => s + (c.ctr || 0), 0) / campaigns.length : 0;

    const platformMap: Record<string, { platform: string; spend: number; leads: number; revenue: number; ctr: number; cpc: number; color: string }> = {
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

    const needsAttention = [
      {
        id: "na1",
        type: "warning",
        title: "LinkedIn Campaign - High CPA",
        description: "LinkedIn Brand Awareness has CPA 2.3x above target. Consider pausing or adjusting targeting.",
        severity: "high",
        campaignId: null,
        metric: "CPA",
        value: 1250,
        action: "Review targeting",
      },
      {
        id: "na2",
        type: "warning",
        title: "Meta - Low CTR",
        description: "3 Meta ad sets have CTR below 0.8%. Creative refresh recommended.",
        severity: "medium",
        campaignId: null,
        metric: "CTR",
        value: 0.72,
        action: "Update creatives",
      },
      {
        id: "na3",
        type: "warning",
        title: "Microsoft Search - Budget Exhausted",
        description: "Microsoft Search campaign exhausted budget at 2 PM. Missing peak evening traffic.",
        severity: "critical",
        campaignId: null,
        metric: "Budget",
        value: 0,
        action: "Increase budget",
      },
    ];

    const opportunities = [
      {
        id: "op1",
        type: "opportunity",
        title: "Scale Google Search - Brand",
        description: "ROAS 7.2x — 40% budget headroom available. Increasing budget by ₹20,000 could yield ₹1.4L additional revenue.",
        severity: "high",
        campaignId: null,
        metric: "ROAS",
        value: 7.2,
        action: "Increase budget",
      },
      {
        id: "op2",
        type: "opportunity",
        title: "Duplicate Meta Retargeting Ad Set",
        description: "Lookalike audience based on converters is performing 3x better than cold audiences.",
        severity: "medium",
        campaignId: null,
        metric: "CPA",
        value: 285,
        action: "Duplicate ad set",
      },
    ];

    const topPerformers = [
      {
        id: "tp1",
        type: "success",
        title: "Google Search - Brand",
        description: "Best ROAS at 7.2x. Generated 48 leads this week at ₹290 CPL.",
        severity: "low",
        campaignId: null,
        metric: "ROAS",
        value: 7.2,
        action: "View campaign",
      },
      {
        id: "tp2",
        type: "success",
        title: "Meta Retargeting",
        description: "Lowest CPA at ₹285. Conversion rate 4.8% above benchmark.",
        severity: "low",
        campaignId: null,
        metric: "CPA",
        value: 285,
        action: "View campaign",
      },
    ];

    res.json({
      totalSpend,
      totalLeads,
      avgRoas,
      avgCpl,
      avgCpa,
      totalRevenue,
      totalClicks,
      avgCtr,
      platforms,
      aiSummary:
        "Google Search generated the most qualified leads at a CPL of ₹308, outperforming benchmarks by 23%. Meta Retargeting achieved the highest ROAS at 4.8x with a strong 3.2% conversion rate. LinkedIn Campaign 3 is overspending its daily budget by 140% — immediate attention required. Overall portfolio ROAS is trending up 0.4x week-over-week.",
      needsAttention,
      opportunities,
      topPerformers,
      period: "yesterday",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get dashboard summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/kpis", async (req, res) => {
  try {
    const campaigns = await db.select().from(campaignsTable);
    const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
    const totalClicks = campaigns.reduce((s, c) => s + (c.clicks || 0), 0);
    const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
    const avgCpl = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const avgCtr = campaigns.length > 0 ? campaigns.reduce((s, c) => s + (c.ctr || 0), 0) / campaigns.length : 0;
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;

    const spark = (base: number) => Array.from({ length: 7 }, (_, i) => base * (0.8 + Math.random() * 0.4));

    const kpis = [
      { id: "spend", label: "Total Spend", value: totalSpend, unit: "₹", trend: "up" as const, trendValue: 8.3, sparkline: spark(totalSpend / 7), description: "Last 30 days" },
      { id: "revenue", label: "Total Revenue", value: totalRevenue, unit: "₹", trend: "up" as const, trendValue: 12.1, sparkline: spark(totalRevenue / 7), description: "Attributed revenue" },
      { id: "roas", label: "ROAS", value: Number(avgRoas.toFixed(1)), unit: "x", trend: "up" as const, trendValue: 5.2, sparkline: spark(avgRoas), description: "Return on ad spend" },
      { id: "leads", label: "Total Leads", value: totalLeads, unit: "", trend: "up" as const, trendValue: 15.4, sparkline: spark(totalLeads / 7), description: "Qualified leads" },
      { id: "cpl", label: "CPL", value: Number(avgCpl.toFixed(0)), unit: "₹", trend: "down" as const, trendValue: 3.8, sparkline: spark(avgCpl), description: "Cost per lead" },
      { id: "ctr", label: "CTR", value: Number(avgCtr.toFixed(2)), unit: "%", trend: "up" as const, trendValue: 0.3, sparkline: spark(avgCtr), description: "Click-through rate" },
      { id: "cpc", label: "CPC", value: Number(avgCpc.toFixed(0)), unit: "₹", trend: "down" as const, trendValue: 2.1, sparkline: spark(avgCpc), description: "Cost per click" },
      { id: "clicks", label: "Clicks", value: totalClicks, unit: "", trend: "up" as const, trendValue: 9.7, sparkline: spark(totalClicks / 7), description: "Total clicks" },
    ];

    res.json(kpis);
  } catch (err) {
    req.log.error({ err }, "Failed to get KPIs");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/platform-comparison", async (req, res) => {
  try {
    const campaigns = await db.select().from(campaignsTable);
    const platformColors: Record<string, string> = {
      google: "#4285F4",
      meta: "#0082FB",
      linkedin: "#0A66C2",
      microsoft: "#00A4EF",
    };

    const platformMap: Record<string, { platform: string; spend: number; leads: number; revenue: number; ctr: number; cpc: number; count: number }> = {};

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
      color: platformColors[p.platform] || "#888",
    }));

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Failed to get platform comparison");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/spend-trend", async (req, res) => {
  try {
    const campaigns = await db.select().from(campaignsTable);
    const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const dailyBase = totalSpend / 30;

    const googleC = campaigns.filter((c) => c.platform === "google").reduce((s, c) => s + (c.spend || 0), 0) / 30;
    const metaC = campaigns.filter((c) => c.platform === "meta").reduce((s, c) => s + (c.spend || 0), 0) / 30;
    const linkedinC = campaigns.filter((c) => c.platform === "linkedin").reduce((s, c) => s + (c.spend || 0), 0) / 30;
    const microsoftC = campaigns.filter((c) => c.platform === "microsoft").reduce((s, c) => s + (c.spend || 0), 0) / 30;

    const trend = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dateStr = date.toISOString().split("T")[0];
      const noise = () => 0.7 + Math.random() * 0.6;
      const google = Math.round(googleC * noise());
      const meta = Math.round(metaC * noise());
      const linkedin = Math.round(linkedinC * noise());
      const microsoft = Math.round(microsoftC * noise());
      return { date: dateStr, google, meta, linkedin, microsoft, total: google + meta + linkedin + microsoft };
    });

    res.json(trend);
  } catch (err) {
    req.log.error({ err }, "Failed to get spend trend");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/ai-insights", async (req, res) => {
  try {
    res.json({
      needsAttention: [
        {
          id: "na1", type: "warning", title: "LinkedIn - High CPA", description: "CPA is 2.3x above target. Consider pausing or adjusting targeting.",
          severity: "high", campaignId: null, metric: "CPA", value: 1250, action: "Review targeting",
        },
        {
          id: "na2", type: "warning", title: "Meta - Low CTR on 3 Ad Sets", description: "CTR below 0.8%. Creative refresh recommended.",
          severity: "medium", campaignId: null, metric: "CTR", value: 0.72, action: "Update creatives",
        },
        {
          id: "na3", type: "warning", title: "Microsoft - Budget Exhausted", description: "Budget exhausted at 2 PM. Missing peak evening traffic.",
          severity: "critical", campaignId: null, metric: "Budget", value: 0, action: "Increase budget",
        },
      ],
      opportunities: [
        {
          id: "op1", type: "opportunity", title: "Scale Google Search Brand", description: "ROAS 7.2x — 40% budget headroom. +₹20K could yield ₹1.4L additional revenue.",
          severity: "high", campaignId: null, metric: "ROAS", value: 7.2, action: "Increase budget",
        },
        {
          id: "op2", type: "opportunity", title: "Duplicate Meta Retargeting", description: "Lookalike audience converting 3x better than cold audiences.",
          severity: "medium", campaignId: null, metric: "CPA", value: 285, action: "Duplicate ad set",
        },
      ],
      topPerformers: [
        {
          id: "tp1", type: "success", title: "Google Search Brand", description: "Best ROAS at 7.2x. 48 leads this week at ₹290 CPL.",
          severity: "low", campaignId: null, metric: "ROAS", value: 7.2, action: "View campaign",
        },
        {
          id: "tp2", type: "success", title: "Meta Retargeting", description: "Lowest CPA at ₹285. Conversion rate 4.8% above benchmark.",
          severity: "low", campaignId: null, metric: "CPA", value: 285, action: "View campaign",
        },
      ],
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get AI insights");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
