import { Router } from "express";
import { db } from "@workspace/db";
import { integrationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/integrations", async (req, res) => {
  try {
    const integrations = await db.select().from(integrationsTable);
    res.json(
      integrations.map((i) => ({
        ...i,
        lastSync: i.lastSync ? i.lastSync.toISOString() : null,
        createdAt: undefined,
        updatedAt: undefined,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list integrations");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/integrations/:id/sync", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(integrationsTable)
      .set({ status: "syncing", lastSync: new Date() })
      .where(eq(integrationsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Integration not found" });

    setTimeout(async () => {
      await db.update(integrationsTable).set({ status: "connected" }).where(eq(integrationsTable.id, id));
    }, 3000);

    res.json({ ...updated, lastSync: updated.lastSync ? updated.lastSync.toISOString() : null, createdAt: undefined, updatedAt: undefined });
  } catch (err) {
    req.log.error({ err }, "Failed to sync integration");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
