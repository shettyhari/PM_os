import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/alerts", async (req, res) => {
  try {
    const { status } = req.query as Record<string, string>;
    let alerts = await db.select().from(alertsTable).orderBy(alertsTable.createdAt);

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
    const { type, title, message, severity, campaignId } = req.body;
    const [created] = await db.insert(alertsTable).values({ type, title, message, severity, campaignId }).returning();
    res.status(201).json({ ...created, createdAt: created.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create alert");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/alerts/:id/read", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(alertsTable).set({ isRead: true }).where(eq(alertsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Alert not found" });
    res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to mark alert as read");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
