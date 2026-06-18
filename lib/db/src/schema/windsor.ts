import { pgTable, serial, text, timestamp, varchar, integer, real, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const windsorConnectionsTable = pgTable("windsor_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  apiKey: text("api_key").notNull(),
  status: text("status").notNull().default("pending"),
  syncInterval: integer("sync_interval").notNull().default(30),
  autoSync: boolean("auto_sync").notNull().default(true),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  lastSyncStatus: text("last_sync_status"),
  lastSyncError: text("last_sync_error"),
  connectedSources: jsonb("connected_sources").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const syncLogsTable = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  windsorConnectionId: integer("windsor_connection_id")
    .notNull()
    .references(() => windsorConnectionsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull(),
  status: text("status").notNull(),
  connector: text("connector"),
  recordsImported: integer("records_imported").notNull().default(0),
  durationMs: integer("duration_ms"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const windsorMetricsTable = pgTable("windsor_metrics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  windsorConnectionId: integer("windsor_connection_id"),
  connector: text("connector").notNull(),
  date: text("date").notNull(),
  accountName: text("account_name"),
  campaignName: text("campaign_name"),
  spend: real("spend"),
  impressions: integer("impressions"),
  clicks: integer("clicks"),
  ctr: real("ctr"),
  cpc: real("cpc"),
  conversions: real("conversions"),
  leads: integer("leads"),
  revenue: real("revenue"),
  rawData: jsonb("raw_data"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiInsightsTable = pgTable("ai_insights", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata"),
  date: text("date").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WindsorConnection = typeof windsorConnectionsTable.$inferSelect;
export type SyncLog = typeof syncLogsTable.$inferSelect;
export type WindsorMetric = typeof windsorMetricsTable.$inferSelect;
export type AiInsight = typeof aiInsightsTable.$inferSelect;
