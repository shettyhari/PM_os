import { Router } from "express";
import { db } from "@workspace/db";
import { campaignsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/campaigns", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { platform, status, search } = req.query as Record<string, string>;

    let campaigns = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.userId, userId));

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

    res.json(campaigns.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list campaigns");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/campaigns", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const { name, platform, budget, startDate } = req.body as Record<string, string>;

    const [created] = await db
      .insert(campaignsTable)
      .values({ userId, name, platform: platform as "google", budget: Number(budget) || 0, startDate, status: "draft" })
      .returning();

    res.status(201).json({ ...created, updatedAt: created.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create campaign");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/top-performers", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.userId, userId));

    const sorted = [...campaigns].sort((a, b) => (b.roas || 0) - (a.roas || 0)).slice(0, 5);
    res.json(sorted.map((c) => ({ ...c, updatedAt: c.updatedAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get top performers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/wasted-spend", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const campaigns = await db
      .select()
      .from(campaignsTable)
      .where(eq(campaignsTable.userId, userId));

    const wastedCampaigns = campaigns
      .filter((c) => (c.roas || 0) < 1.5 && (c.spend || 0) > 5000)
      .map((c) => ({
        campaignId: c.id,
        campaignName: c.name,
        platform: c.platform,
        wastedAmount: (c.spend || 0) * 0.4,
        reason: (c.roas || 0) < 0.5 ? "ROAS below break-even" : "High CPA with low conversion rate",
      }));

    const totalWasted = wastedCampaigns.reduce((s, c) => s + c.wastedAmount, 0);
    res.json({ totalWasted, campaigns: wastedCampaigns });
  } catch (err) {
    req.log.error({ err }, "Failed to get wasted spend");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/campaigns/:id", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const id = parseInt(req.params["id"]!);

    const [campaign] = await db
      .select()
      .from(campaignsTable)
      .where(and(eq(campaignsTable.id, id), eq(campaignsTable.userId, userId)));

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    res.json({ ...campaign, updatedAt: campaign.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get campaign");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/campaigns/:id", async (req, res) => {
  try {
    const userId = req.session.userId!;
    const id = parseInt(req.params["id"]!);
    const { name, status, budget } = req.body as Record<string, string>;

    const updates: Partial<typeof campaignsTable.$inferInsert> = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status as "active";
    if (budget !== undefined) updates.budget = Number(budget);

    const [updated] = await db
      .update(campaignsTable)
      .set(updates)
      .where(and(eq(campaignsTable.id, id), eq(campaignsTable.userId, userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update campaign");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
