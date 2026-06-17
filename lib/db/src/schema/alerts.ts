import { pgTable, text, serial, timestamp, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const alertTypeEnum = pgEnum("alert_type", [
  "high_cpa", "low_ctr", "budget_exhausted", "conversion_drop", "roas_drop", "opportunity",
]);
export const severityEnum = pgEnum("severity", ["low", "medium", "high", "critical"]);

export const alertsTable = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }),
  type: alertTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  severity: severityEnum("severity").notNull().default("medium"),
  isRead: boolean("is_read").notNull().default(false),
  campaignId: integer("campaign_id"),
  campaignName: text("campaign_name"),
  platform: text("platform"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;
