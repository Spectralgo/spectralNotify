import { readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "drizzle-kit";

// Find the local SQLite database created by Alchemy/Miniflare
function findLocalDatabase(): string {
  const miniflareDir =
    "../../.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject";

  try {
    const files = readdirSync(miniflareDir);
    const sqliteFile = files.find((file) => file.endsWith(".sqlite"));

    if (!sqliteFile) {
      throw new Error(
        "No local D1 database found. Run 'pnpm dev' first to create the local database."
      );
    }

    return join(miniflareDir, sqliteFile);
  } catch {
    throw new Error(
      `Local database directory not found at ${miniflareDir}. Run 'pnpm dev' first.`
    );
  }
}

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: findLocalDatabase(),
  },
});
