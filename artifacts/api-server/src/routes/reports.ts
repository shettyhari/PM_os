import { Router } from "express";
import { db } from "@workspace/db";
import { reportsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/reports", async (req, res) => {
  try {
    const userId = req.user!.id;
    const reports = await db
      .select()
      .from(reportsTable)
      .where(eq(reportsTable.userId, userId))
      .orderBy(reportsTable.createdAt);

    res.json(
      reports.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list reports");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reports", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { title, type } = req.body as Record<string, string>;

    const [created] = await db
      .insert(reportsTable)
      .values({ userId, title, type: type ?? "performance", status: "generating" })
      .returning();

    setTimeout(async () => {
      try {
        await db
          .update(reportsTable)
          .set({ status: "ready" })
          .where(eq(reportsTable.id, created!.id));
      } catch {}
    }, 5000);

    res.status(201).json({
      ...created,
      createdAt: created!.createdAt.toISOString(),
      updatedAt: created!.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create report");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/reports/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params["id"]!);

    const [deleted] = await db
      .delete(reportsTable)
      .where(and(eq(reportsTable.id, id), eq(reportsTable.userId, userId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Report not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete report");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
