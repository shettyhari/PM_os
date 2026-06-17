import { pgTable, text, serial, timestamp, real, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const platformEnum = pgEnum("platform", ["google", "meta", "linkedin", "microsoft"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["active", "paused", "ended", "draft"]);

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  platform: platformEnum("platform").notNull(),
  status: campaignStatusEnum("status").notNull().default("active"),
  spend: real("spend").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  ctr: real("ctr").notNull().default(0),
  cpc: real("cpc").notNull().default(0),
  leads: integer("leads").notNull().default(0),
  cpa: real("cpa").notNull().default(0),
  roas: real("roas").notNull().default(0),
  revenue: real("revenue").notNull().default(0),
  impressions: integer("impressions").notNull().default(0),
  cpm: real("cpm").notNull().default(0),
  conversionRate: real("conversion_rate").notNull().default(0),
  budget: real("budget").notNull().default(0),
  startDate: text("start_date"),
  endDate: text("end_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
