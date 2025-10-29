import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Workflow Registry - tracks all created workflows
 * This allows us to list all workflows without querying the Cloudflare API
 */
export const workflowRegistry = sqliteTable("workflow_registry", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  workflowId: text("workflow_id").notNull().unique(),
  createdAt: text("created_at").notNull(),
  createdBy: text("created_by").notNull(), // user ID
});

// Type exports
export type WorkflowRegistry = typeof workflowRegistry.$inferSelect;
export type NewWorkflowRegistry = typeof workflowRegistry.$inferInsert;
