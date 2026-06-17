import { pgTable, text, serial, timestamp, real, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const leadStatusEnum = pgEnum("lead_status", ["new", "contacted", "qualified", "proposal", "won", "lost"]);
export const leadSourceEnum = pgEnum("lead_source", ["google", "meta", "linkedin", "microsoft", "organic", "referral"]);

export const leadsTable = pgTable("leads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  status: leadStatusEnum("status").notNull().default("new"),
  source: leadSourceEnum("source").notNull().default("google"),
  campaign: text("campaign").notNull(),
  revenue: real("revenue"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertLeadSchema = createInsertSchema(leadsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;
