import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Task metadata table - stores single task instance data
 * Only one row with id=1 per task instance
 */
export const taskMetadata = sqliteTable("task_metadata", {
  id: integer("id").primaryKey(),
  taskId: text("task_id").notNull(),
  status: text("status").notNull(), // "pending" | "in-progress" | "success" | "failed" | "canceled"
  progress: integer("progress").notNull().default(0), // 0-100
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  completedAt: text("completed_at"),
  failedAt: text("failed_at"),
  canceledAt: text("canceled_at"),
  metadata: text("metadata").notNull(), // JSON string
});

/**
 * Task history table - stores event log
 */
export const taskHistory = sqliteTable("task_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  eventType: text("event_type").notNull(), // "log" | "progress" | "error" | "success"
  message: text("message").notNull(),
  progress: integer("progress"), // Optional progress value
  timestamp: text("timestamp").notNull(),
  metadata: text("metadata"), // Optional JSON string
});

// Type exports for use in handlers and components
export type TaskMetadata = typeof taskMetadata.$inferSelect;
export type TaskHistory = typeof taskHistory.$inferSelect;
export type NewTaskMetadata = typeof taskMetadata.$inferInsert;
export type NewTaskHistory = typeof taskHistory.$inferInsert;
