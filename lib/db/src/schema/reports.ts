import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reportTypeEnum = pgEnum("report_type", ["weekly", "monthly", "campaign", "custom"]);
export const reportStatusEnum = pgEnum("report_status", ["generating", "ready", "scheduled"]);

export const reportsTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: reportTypeEnum("type").notNull(),
  status: reportStatusEnum("status").notNull().default("generating"),
  period: text("period"),
  downloadUrl: text("download_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ id: true, createdAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reportsTable.$inferSelect;
