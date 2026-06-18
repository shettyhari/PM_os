import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userSettingsTable = pgTable("user_settings", {
  userId: varchar("user_id")
    .notNull()
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  geminiApiKey: text("gemini_api_key"),
  googleClientId: text("google_client_id"),
  googleClientSecret: text("google_client_secret"),
  metaAppId: text("meta_app_id"),
  metaAppSecret: text("meta_app_secret"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserSettings = typeof userSettingsTable.$inferSelect;
