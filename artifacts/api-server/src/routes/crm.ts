import { Router } from "express";
import { db } from "@workspace/db";
import { leadsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/crm/leads", async (req, res) => {
  try {
    const { status, search } = req.query as Record<string, string>;
    let leads = await db.select().from(leadsTable).orderBy(leadsTable.createdAt);

    if (status && status !== "all") {
      leads = leads.filter((l) => l.status === status);
    }
    if (search) {
      const q = search.toLowerCase();
      leads = leads.filter((l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q));
    }

    res.json(
      leads.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
        updatedAt: l.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to list leads");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/crm/leads", async (req, res) => {
  try {
    const { name, email, phone, source, campaign, notes } = req.body;
    const [created] = await db.insert(leadsTable).values({ name, email, phone, source, campaign, notes }).returning();
    res.status(201).json({ ...created, createdAt: created.createdAt.toISOString(), updatedAt: created.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/crm/leads/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, notes, revenue } = req.body;
    const updates: Partial<typeof leadsTable.$inferInsert> = {};
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;
    if (revenue !== undefined) updates.revenue = revenue;

    const [updated] = await db.update(leadsTable).set(updates).where(eq(leadsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Lead not found" });
    res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update lead");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/crm/summary", async (req, res) => {
  try {
    const leads = await db.select().from(leadsTable);
    const statusLabels = ["new", "contacted", "qualified", "proposal", "won", "lost"];
    const dealValues: Record<string, number> = { new: 0, contacted: 0, qualified: 50000, proposal: 200000, won: 500000, lost: 0 };

    const byStatus = statusLabels.map((status) => {
      const group = leads.filter((l) => l.status === status);
      const value = group.reduce((s, l) => s + (l.revenue || dealValues[status] || 0), 0);
      return { status, count: group.length, value };
    });

    const wonLeads = leads.filter((l) => l.status === "won");
    const totalRevenue = wonLeads.reduce((s, l) => s + (l.revenue || 500000), 0);
    const conversionRate = leads.length > 0 ? (wonLeads.length / leads.length) * 100 : 0;
    const avgDealSize = wonLeads.length > 0 ? totalRevenue / wonLeads.length : 0;

    res.json({ totalLeads: leads.length, byStatus, totalRevenue, conversionRate, avgDealSize });
  } catch (err) {
    req.log.error({ err }, "Failed to get CRM summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
