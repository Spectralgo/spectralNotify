import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config for Workflow Durable Object migrations
 *
 * Usage:
 *   pnpm workflow:generate
 *
 * This will automatically generate SQL migrations and migrations.js
 * based on the workflow schema using the durable-sqlite driver.
 */
export default defineConfig({
  schema: "./src/workflow-schema.ts",
  out: "./src/workflow-migrations",
  dialect: "sqlite",
  driver: "durable-sqlite",
});
