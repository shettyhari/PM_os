import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const integrationPlatformEnum = pgEnum("integration_platform", ["google_ads", "meta_ads", "linkedin_ads", "microsoft_ads", "ga4", "gtm", "search_console"]);
export const integrationStatusEnum = pgEnum("integration_status", ["connected", "disconnected", "error", "syncing"]);

export const integrationsTable = pgTable("integrations", {
  id: serial("id").primaryKey(),
  platform: integrationPlatformEnum("platform").notNull(),
  name: text("name").notNull(),
  status: integrationStatusEnum("status").notNull().default("disconnected"),
  accountsConnected: integer("accounts_connected").notNull().default(0),
  lastSync: timestamp("last_sync", { withTimezone: true }),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertIntegrationSchema = createInsertSchema(integrationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrationsTable.$inferSelect;
