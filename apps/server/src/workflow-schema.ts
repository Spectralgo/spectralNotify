import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Workflow metadata table - stores single workflow instance data
 * Only one row with id=1 per workflow instance
 */
export const workflowMetadata = sqliteTable("workflow_metadata", {
  id: integer("id").primaryKey(),
  workflowId: text("workflow_id").notNull(),
  status: text("status").notNull(), // "pending" | "in-progress" | "success" | "failed" | "canceled"
  overallProgress: integer("overall_progress").notNull().default(0), // 0-100
  expectedPhaseCount: integer("expected_phase_count").notNull().default(0),
  completedPhaseCount: integer("completed_phase_count").notNull().default(0),
  activePhaseKey: text("active_phase_key"), // Current active phase (first non-success phase by order)
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  completedAt: text("completed_at"),
  failedAt: text("failed_at"),
  canceledAt: text("canceled_at"),
  metadata: text("metadata").notNull(), // JSON string
});

/**
 * Workflow phases table - stores phase data relationally
 * One row per phase, strongly typed
 * Supports hierarchical phases via parentPhaseKey
 */
export const workflowPhases = sqliteTable("workflow_phases", {
  workflowId: text("workflow_id").notNull(),
  phaseKey: text("phase_key").notNull().primaryKey(), // Unique key within workflow
  label: text("label").notNull(), // Display name
  weight: real("weight").notNull(), // 0-1, used for overall progress computation
  status: text("status").notNull(), // "pending" | "in-progress" | "success" | "failed" | "canceled"
  progress: integer("progress").notNull().default(0), // 0-100
  order: integer("order").notNull(), // Execution order (0, 1, 2, ...)
  parentPhaseKey: text("parent_phase_key"), // null for top-level phases, parent key for children
  depth: integer("depth").notNull().default(0), // 0 for top-level, 1+ for nested
  startedAt: text("started_at"),
  updatedAt: text("updated_at"),
  completedAt: text("completed_at"),
});

/**
 * Workflow history table - stores event log
 */
export const workflowHistory = sqliteTable("workflow_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workflowId: text("workflow_id").notNull(), // Explicit workflow reference for export/debug
  eventType: text("event_type").notNull(), // "log" | "phase-progress" | "workflow-progress" | "error" | "success" | "cancel"
  phaseKey: text("phase_key"), // Optional: which phase this event relates to
  message: text("message").notNull(),
  progress: integer("progress"), // Optional progress value (phase or overall)
  timestamp: text("timestamp").notNull(),
  metadata: text("metadata"), // Optional JSON string
});

// Type exports for use in handlers and components
export type WorkflowMetadata = typeof workflowMetadata.$inferSelect;
export type WorkflowPhase = typeof workflowPhases.$inferSelect;
export type WorkflowHistory = typeof workflowHistory.$inferSelect;
export type NewWorkflowMetadata = typeof workflowMetadata.$inferInsert;
export type NewWorkflowPhase = typeof workflowPhases.$inferInsert;
export type NewWorkflowHistory = typeof workflowHistory.$inferInsert;
