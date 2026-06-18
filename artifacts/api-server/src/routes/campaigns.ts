import { Router } from "express";
import { db } from "@workspace/db";
import { windsorMetricsTable } from "@workspace/db";
import { eq, and, gte } from "drizzle-orm";
import { connectorDisplayName } from "../services/windsor";

const router = Router();

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0]!;
}

/** Aggregate Windsor metrics into campaign-level rows */
async function buildCampaignList(userId: string, days = 30) {
  const rows = await db
    .select()
    .from(windsorMetricsTable)
    .where(and(eq(windsorMetricsTable.userId, userId), gte(windsorMetricsTable.date, cutoffDate(days))));

  // Group by connector × campaignName
  const map: Record<
    string,
    {
      id: string;
      name: string;
      platform: string;
      displayName: string;
      accountName: string;
      status: string;
      spend: number;
      clicks: number;
      impressions: number;
      ctr: number;
      cpc: number;
      leads: number;
      conversions: number;
      revenue: number;
      roas: number;
      days: number;
      updatedAt: string;
    }
  > = {};

  for (const r of rows) {
    const key = `${r.connector}::${r.campaignName ?? "Unknown"}`;
    if (!map[key]) {
      map[key] = {
        id: key,
        name: r.campaignName ?? "Unknown",
        platform: r.connector,
        displayName: connectorDisplayName(r.connector),
        accountName: r.accountName ?? "",
        status: "active",
        spend: 0,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        cpc: 0,
        leads: 0,
        conversions: 0,
        revenue: 0,
        roas: 0,
        days,
        updatedAt: new Date().toISOString(),
      };
    }
    map[key].spend += r.spend ?? 0;
    map[key].clicks += r.clicks ?? 0;
    map[key].impressions += r.impressions ?? 0;
    map[key].leads += r.leads ?? 0;
    map[key].conversions += r.conversions ?? 0;
    map[key].revenue += r.revenue ?? 0;
  }

  return Object.values(map).map((c) => ({
    ...c,
    ctr: c.impressions > 0 ? c.clicks / c.impressions : 0,
    cpc: c.clicks > 0 ? c.spend / c.clicks : 0,
    roas: c.spend > 0 ? c.revenue / c.spend : 0,
    cpa: (c.leads + c.conversions) > 0 ? c.spend / (c.leads + c.conversions) : 0,
  }));
}

router.get("/campaigns", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { platform, status, search, days = "30" } = req.query as Record<string, string>;

    let campaigns = await buildCampaignList(userId, parseInt(days));

    if (platform && platform !== "all") {
      campaigns = campaigns.filter((c) => c.platform === platform);
    }
    if (status && status !== "all") {
      campaigns = campaigns.filter((c) => c.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      campaigns = campaigns.filter((c) => c.name.toLowerCase().includes(q));
    }

    res.json(campaigns);
  } catch (err) {
    req.log.error({ err }, "Failed to list campaigns");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/top-performers", async (req, res) => {
  try {
    const userId = req.user!.id;
    const campaigns = await buildCampaignList(userId, 30);
    const sorted = campaigns.sort((a, b) => b.spend - a.spend).slice(0, 5);
    res.json(sorted);
  } catch (err) {
    req.log.error({ err }, "Failed to get top performers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/wasted-spend", async (req, res) => {
  try {
    const userId = req.user!.id;
    const campaigns = await buildCampaignList(userId, 30);

    const wasted = campaigns
      .filter((c) => c.spend > 5000 && (c.leads + c.conversions) === 0)
      .map((c) => ({
        campaignId: c.id,
        campaignName: c.name,
        platform: c.platform,
        displayName: c.displayName,
        wastedAmount: c.spend,
        reason: "No conversions tracked — conversion tracking not configured",
      }));

    const totalWasted = wasted.reduce((s, c) => s + c.wastedAmount, 0);
    res.json({ totalWasted, campaigns: wasted });
  } catch (err) {
    req.log.error({ err }, "Failed to get wasted spend");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = req.params["id"]!;

    const campaigns = await buildCampaignList(userId, 30);
    const campaign = campaigns.find((c) => c.id === decodeURIComponent(id));

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    res.json(campaign);
  } catch (err) {
    req.log.error({ err }, "Failed to get campaign");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
