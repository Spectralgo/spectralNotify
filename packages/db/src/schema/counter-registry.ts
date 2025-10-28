import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Counter Registry - tracks all created counters
 * This allows us to list all counters without querying the Cloudflare API
 */
export const counterRegistry = sqliteTable("counter_registry", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").notNull(), // user ID
});

// Type exports
export type CounterRegistry = typeof counterRegistry.$inferSelect;
export type NewCounterRegistry = typeof counterRegistry.$inferInsert;
