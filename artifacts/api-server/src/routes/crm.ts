import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/crm/leads", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { status, search } = req.query as Record<string, string>;

    let leads = await db
      .select()
      .from(leadsTable)
      .where(eq(leadsTable.userId, userId));

    if (status && status !== "all") {
      leads = leads.filter((l) => l.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.email ?? "").toLowerCase().includes(q),
      );
    }

    res.json(
      leads.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      })),
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list leads");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/crm/leads", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name, email, phone, source, notes, revenue } = req.body as Record<string, string>;

    const [created] = await db
      .insert(leadsTable)
      .values({
        userId,
        name,
        email,
        phone,
        source,
        notes,
        revenue: revenue ? parseFloat(revenue) : undefined,
      })
      .returning();

    res.status(201).json({
      ...created,
      createdAt: created!.createdAt.toISOString(),
      updatedAt: created!.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/crm/leads/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params["id"]!);
    const { status, notes, revenue } = req.body as Record<string, string>;

    const updates: Record<string, unknown> = {};
    if (status) updates["status"] = status;
    if (notes !== undefined) updates["notes"] = notes;
    if (revenue !== undefined) updates["revenue"] = parseFloat(revenue);

    const [updated] = await db
      .update(leadsTable)
      .set(updates)
      .where(and(eq(leadsTable.id, id), eq(leadsTable.userId, userId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/crm/leads/:id", async (req, res) => {
  try {
    const userId = req.user!.id;
    const id = parseInt(req.params["id"]!);

    const [deleted] = await db
      .delete(leadsTable)
      .where(and(eq(leadsTable.id, id), eq(leadsTable.userId, userId)))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
