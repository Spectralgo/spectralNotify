import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Counter metadata table - stores single counter instance data
 * Only one row with id=1 per counter instance
 */
export const counterMetadata = sqliteTable("counter_metadata", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  value: integer("value").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  operationCount: integer("operation_count").notNull().default(0),
});

/**
 * Counter history table - stores operation log
 */
export const counterHistory = sqliteTable("counter_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  operation: text("operation").notNull(),
  previousValue: integer("previous_value").notNull(),
  newValue: integer("new_value").notNull(),
  timestamp: text("timestamp").notNull(),
});

// Type exports for use in handlers and components
export type CounterMetadata = typeof counterMetadata.$inferSelect;
export type CounterHistory = typeof counterHistory.$inferSelect;
export type NewCounterMetadata = typeof counterMetadata.$inferInsert;
export type NewCounterHistory = typeof counterHistory.$inferInsert;
