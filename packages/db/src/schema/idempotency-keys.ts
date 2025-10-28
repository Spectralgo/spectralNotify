import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Idempotency Keys
 *
 * Stores processed idempotency keys with their cached responses.
 * Keys expire after 24 hours and are automatically cleaned up.
 *
 * Used to prevent duplicate mutations when clients retry requests.
 */
export const idempotencyKeys = sqliteTable("idempotency_keys", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  response: text("response").notNull(), // JSON stringified response
  endpoint: text("endpoint").notNull(), // Endpoint that was called
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(), // 24h from creation
});
