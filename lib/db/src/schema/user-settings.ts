import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userSettingsTable = pgTable("user_settings", {
  userId: varchar("user_id")
    .notNull()
    .primaryKey()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  geminiApiKey: text("gemini_api_key"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UserSettings = typeof userSettingsTable.$inferSelect;
