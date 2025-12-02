import { readdirSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import Database from "better-sqlite3";
import dotenv from "dotenv";

// Load env from apps/server/.env for remote credentials
dotenv.config({ path: "../../apps/server/.env" });

const isRemote = process.argv.includes("--remote");

// Tables in deletion order (foreign key safe)
const TABLES_TO_CLEAR = [
  "session",
  "account",
  "verification",
  "idempotency_keys",
  "task_registry",
  "workflow_registry",
  "counter_registry",
  "user",
] as const;

function findLocalDatabase(): string {
  const miniflareDir =
    "../../.alchemy/miniflare/v3/d1/miniflare-D1DatabaseObject";

  const files = readdirSync(miniflareDir);
  const sqliteFile = files.find((file) => file.endsWith(".sqlite"));

  if (!sqliteFile) {
    throw new Error(
      "No local D1 database found. Run 'pnpm dev' first to create the local database."
    );
  }

  return join(miniflareDir, sqliteFile);
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y");
    });
  });
}

async function clearLocalDatabase() {
  console.log("Clearing local D1 database...\n");

  const dbPath = findLocalDatabase();
  console.log(`Database path: ${dbPath}\n`);

  const db = new Database(dbPath);

  for (const table of TABLES_TO_CLEAR) {
    const result = db.prepare(`DELETE FROM ${table}`).run();
    console.log(`Cleared ${table}: ${result.changes} rows deleted`);
  }

  db.close();
  console.log("\nLocal database cleared successfully.");
}

async function clearRemoteDatabase() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.DATABASE_ID;
  const apiToken = process.env.CLOUDFLARE_READ_API_TOKEN;

  if (!accountId || !databaseId || !apiToken) {
    console.error("Missing required environment variables:");
    if (!accountId) console.error("  - CLOUDFLARE_ACCOUNT_ID");
    if (!databaseId) console.error("  - DATABASE_ID");
    if (!apiToken) console.error("  - CLOUDFLARE_READ_API_TOKEN");
    process.exit(1);
  }

  console.log("WARNING: You are about to clear the REMOTE D1 database!");
  console.log(`Database ID: ${databaseId}\n`);

  const confirmed = await confirm(
    "Are you sure you want to clear all data from the remote database?"
  );

  if (!confirmed) {
    console.log("Aborted.");
    process.exit(0);
  }

  console.log("\nClearing remote D1 database...\n");

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  for (const table of TABLES_TO_CLEAR) {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql: `DELETE FROM ${table}`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`Failed to clear ${table}: ${error}`);
      continue;
    }

    const result = (await response.json()) as {
      result: Array<{ meta: { changes: number } }>;
    };
    const changes = result.result?.[0]?.meta?.changes ?? 0;
    console.log(`Cleared ${table}: ${changes} rows deleted`);
  }

  console.log("\nRemote database cleared successfully.");
}

async function main() {
  if (isRemote) {
    await clearRemoteDatabase();
  } else {
    await clearLocalDatabase();
  }
}

main().catch((error) => {
  console.error("Error clearing database:", error);
  process.exit(1);
});
