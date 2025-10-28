import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Task Registry - tracks all created tasks
 * This allows us to list all tasks without querying the Cloudflare API
 */
export const taskRegistry = sqliteTable("task_registry", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskId: text("task_id").notNull().unique(),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").notNull(), // user ID
});

// Type exports
export type TaskRegistry = typeof taskRegistry.$inferSelect;
export type NewTaskRegistry = typeof taskRegistry.$inferInsert;
