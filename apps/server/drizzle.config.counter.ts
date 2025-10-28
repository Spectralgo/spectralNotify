import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config for Counter Durable Object migrations
 *
 * Usage:
 *   pnpm counter:generate
 *
 * This will automatically generate SQL migrations and migrations.js
 * based on the counter schema using the durable-sqlite driver.
 */
export default defineConfig({
  schema: "./src/counter-schema.ts",
  out: "./src/counter-migrations",
  dialect: "sqlite",
  driver: "durable-sqlite",
});
