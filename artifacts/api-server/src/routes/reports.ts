import { Router } from "express";
import { db } from "@workspace/db";
import { reportsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/reports", async (req, res) => {
  try {
    const reports = await db.select().from(reportsTable).orderBy(reportsTable.createdAt);
    res.json(reports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to list reports");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reports", async (req, res) => {
  try {
    const { title, type, period } = req.body;
    const [created] = await db.insert(reportsTable).values({ title, type, period, status: "generating" }).returning();

    setTimeout(async () => {
      try {
        await db.update(reportsTable).set({ status: "ready" }).where(eq(reportsTable.id, created.id));
      } catch {}
    }, 5000);

    res.status(201).json({ ...created, createdAt: created.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create report");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
