import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/alerts", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { status } = req.query as Record<string, string>;

    let alerts = await db
      .select()
      .from(alertsTable)
      .where(eq(alertsTable.userId, userId));

    if (status === "unread") alerts = alerts.filter((a) => !a.isRead);
    else if (status === "read") alerts = alerts.filter((a) => a.isRead);

    res.json(alerts.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list alerts");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/alerts", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { type, title, description, severity, campaignId } = req.body as Record<string, string>;

    const [created] = await db
      .insert(alertsTable)
      .values({
        userId,
        type: type as "high_cpa",
        title,
        description,
        severity: severity as "medium",
        campaignId: campaignId ? parseInt(campaignId) : undefined,
      })
      .returning();

    res.status(201).json({ ...created, createdAt: created!.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create alert");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/alerts/:id/read", async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params["id"]!);

    const [updated] = await db
      .update(alertsTable)
      .set({ isRead: true })
      .where(and(eq(alertsTable.id, id), eq(alertsTable.userId, userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Alert not found" });
      return;
    }

    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to mark alert as read");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/alerts/read-all", async (req, res) => {
  try {
    const userId = req.user!.id;
    await db.update(alertsTable).set({ isRead: true }).where(eq(alertsTable.userId, userId));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to mark all alerts as read");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
