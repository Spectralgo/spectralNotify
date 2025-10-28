import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config for Task Durable Object migrations
 *
 * Usage:
 *   pnpm task:generate
 *
 * This will automatically generate SQL migrations and migrations.js
 * based on the task schema using the durable-sqlite driver.
 */
export default defineConfig({
  schema: "./src/task-schema.ts",
  out: "./src/task-migrations",
  dialect: "sqlite",
  driver: "durable-sqlite",
});
