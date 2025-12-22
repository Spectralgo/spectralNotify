import alchemy from "alchemy";
import {
  D1Database,
  DurableObjectNamespace,
  Vite,
  Worker,
} from "alchemy/cloudflare";
import { Exec } from "alchemy/os";
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
process.chdir(repoRoot);

/**
 * Fix: prevent "old build" deployments.
 *
 * What was happening:
 * - `alchemy deploy` determines whether a resource (Worker/Vite) needs updating by diffing the
 *   resource *configuration* (props/bindings), not by looking at your git commit or local file mtimes.
 * - If your Worker/Vite config is unchanged, Alchemy can decide "no changes" and skip publishing a
 *   new bundle, even though your application source code changed. That looks like "it deployed, but
 *   I'm still seeing the old build".
 * - In this repo we also had generated `alchemy.run.js` artifacts at times; depending on how deploy
 *   is invoked, it's easy to accidentally run an older compiled entrypoint rather than the current
 *   `alchemy.run.ts`.
 *
 * How this fixes it:
 * - We compute a deterministic content hash of the relevant source trees and inject it as an env var
 *   binding (`BUILD_ID` for the server Worker, `VITE_BUILD_ID` for the web Vite build).
 * - When source code changes, the hash changes -> the binding value changes -> Alchemy sees a config
 *   diff -> Alchemy is forced to republish the Worker/Vite outputs.
 * - We intentionally skip build artifacts (`dist/`, `.alchemy/`, etc.) so the hash only changes when
 *   actual source/config changes.
 *
 * Tip: after deploy you can verify the served web build by checking the HTML meta:
 *   `<meta name="build-id" content="web-...">`
 */
const INCLUDED_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".html",
  ".sql",
]);

const SKIP_DIR_NAMES = new Set([
  ".alchemy",
  ".git",
  ".turbo",
  ".wrangler",
  "build",
  "dist",
  "node_modules",
]);

async function listIncludedFiles(relPath: string): Promise<string[]> {
  const absPath = path.resolve(relPath);
  const entries = await readdir(absPath, { withFileTypes: true });

  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      files.push(
        ...(await listIncludedFiles(path.join(relPath, entry.name))),
      );
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name);
    if (!INCLUDED_EXTENSIONS.has(ext)) continue;
    files.push(path.join(relPath, entry.name));
  }

  return files;
}

async function contentHash(paths: string[]): Promise<string> {
  // Stable "content fingerprint" for a set of files/directories.
  // This is used only to force Alchemy to detect a meaningful change.
  const files = (
    await Promise.all(
      paths.map(async (p) => {
        const absPath = path.resolve(p);
        const stats = await stat(absPath);
        return stats.isFile() ? [p] : listIncludedFiles(p);
      }),
    )
  )
    .flat()
    .sort();

  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(await readFile(path.resolve(file)));
    hash.update("\0");
  }
  return hash.digest("hex");
}

config({ path: "./.env" });
config({ path: "./apps/web/.env" });
config({ path: "./apps/server/.env" });

const app = await alchemy("spectral-notify");

// Any change in these inputs should trigger a new server publish.
const serverBuildId = `srv-${(await contentHash([
  "apps/server/src",
  "packages/api/src",
  "packages/auth/src",
  "packages/db/src",
])).slice(0, 12)}`;

// Any change in these inputs should trigger a new web build/publish.
// Note: Vite env vars are injected at build time; this also helps confirm which build is served.
const webBuildId = `web-${(await contentHash([
  "apps/web/src",
  "apps/web/index.html",
  "apps/web/vite.config.ts",
  "packages/api/src",
  "packages/auth/src",
])).slice(0, 12)}`;

await Exec("db-generate", {
  cwd: "packages/db",
  command: "pnpm run db:generate",
});

const db = await D1Database("database", {
  migrationsDir: "packages/db/src/migrations",
});

// Output database dashboard URL
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const dashboardUrl = accountId
  ? `https://dash.cloudflare.com/${accountId}/workers/d1`
  : null;
if (dashboardUrl) {
  console.log(`\nD1 Dashboard -> ${dashboardUrl}`);
}

// Create Counter Durable Object namespace with SQLite storage
const counter = DurableObjectNamespace("counter", {
  className: "Counter",
  sqlite: true,
});

// Create Task Durable Object namespace with SQLite storage
const task = DurableObjectNamespace("task", {
  className: "Task",
  sqlite: true,
});

// Create Workflow Durable Object namespace with SQLite storage
const workflow = DurableObjectNamespace("workflow", {
  className: "Workflow",
  sqlite: true,
});

// Create server first to get its URL for the web build
export const server = await Worker("server", {
  cwd: "apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  domains: ["notify-api.spectralgo.com"],
  bundle: {
    // Configure esbuild to load .sql files as text strings
    // This allows Drizzle migrations to import SQL files directly
    loader: {
      ".sql": "text",
    },
  },
  bindings: {
    BUILD_ID: serverBuildId,
    DB: db,
    COUNTER: counter,
    TASK: task,
    WORKFLOW: workflow,
    CORS_ORIGIN: "", // Set dynamically after web is created
    BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET),
    BETTER_AUTH_URL: "", // Set dynamically after server URL is known
    ALLOWED_EMAIL: alchemy.secret(process.env.ALLOWED_EMAIL),
    SPECTRAL_NOTIFY_API_KEY: alchemy.secret(
      process.env.SPECTRAL_NOTIFY_API_KEY
    ),
    GOOGLE_CLIENT_ID: alchemy.secret(process.env.GOOGLE_CLIENT_ID),
    GOOGLE_CLIENT_SECRET: alchemy.secret(process.env.GOOGLE_CLIENT_SECRET),
  },
  dev: {
    port: 8094,
  },
});

// Create web with server URL available at build time
export const web = await Vite("web", {
  cwd: "apps/web",
  assets: "dist",
  compatibility: "node",
  domains: ["notify.spectralgo.com"],
  bindings: {
    VITE_SERVER_URL: server.url!,
    VITE_BUILD_ID: webBuildId,
  },
  dev: {
    command: "pnpm run dev",
  },
});

// Set dynamic bindings - use server.url and web.url for correct dev/prod URLs
// Type assertion needed because alchemy types bindings as readonly
(server.bindings as { BETTER_AUTH_URL: string }).BETTER_AUTH_URL = server.url!;
(server.bindings as { CORS_ORIGIN: string }).CORS_ORIGIN = web.url!;

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
