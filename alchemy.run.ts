import alchemy from "alchemy";
import {
  D1Database,
  DurableObjectNamespace,
  Vite,
  Worker,
} from "alchemy/cloudflare";
import { Exec } from "alchemy/os";
import { config, parse } from "dotenv";
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));
process.chdir(repoRoot);

// Detect if running in dev mode (alchemy dev) vs deploy mode (alchemy deploy)
// Alchemy passes "--dev" flag, not "dev" as a positional argument
const isDevMode = process.argv.includes("--dev");

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

async function readDevVars(filePath: string): Promise<Record<string, string>> {
  try {
    const contents = await readFile(path.resolve(filePath), "utf8");
    return parse(contents);
  } catch (error) {
    const fsError = error as NodeJS.ErrnoException | null;
    if (fsError?.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

config({ path: "./.env" });
config({ path: "./apps/web/.env" });
config({ path: "./apps/server/.env" });

const devVars = isDevMode ? await readDevVars("apps/server/.dev.vars") : {};
const getRuntimeEnv = (key: string): string | undefined =>
  isDevMode ? devVars[key] ?? process.env[key] : process.env[key];

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

const db = await D1Database("spectral-notify-database-spectralgo", {
  name: "spectral-notify-database-spectralgo",
  migrationsDir: "packages/db/src/migrations",
  adopt: true, // Adopt existing database if it already exists in Cloudflare
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

// Define custom domains for production OAuth and CORS configuration
const SERVER_CUSTOM_DOMAIN = "notify-api.spectralgo.com";
const WEB_CUSTOM_DOMAIN = "notify.spectralgo.com";

const DEFAULT_DEV_SERVER_URL = "http://localhost:8094";
const DEFAULT_DEV_WEB_ORIGIN = "http://localhost:3014";

// Use dev vars (if present) in dev mode, custom domains in production
const serverUrl = isDevMode
  ? normalizeUrl(getRuntimeEnv("BETTER_AUTH_URL") ?? DEFAULT_DEV_SERVER_URL)
  : `https://${SERVER_CUSTOM_DOMAIN}`;
const corsOrigin = isDevMode
  ? (getRuntimeEnv("CORS_ORIGIN") ?? DEFAULT_DEV_WEB_ORIGIN).trim()
  : `https://${WEB_CUSTOM_DOMAIN}`;
const viteServerUrl = isDevMode
  ? normalizeUrl(process.env.VITE_SERVER_URL || serverUrl)
  : `https://${SERVER_CUSTOM_DOMAIN}`;
const authCookieDomain = isDevMode
  ? undefined
  : getRuntimeEnv("BETTER_AUTH_COOKIE_DOMAIN") ?? ".spectralgo.com";

// Create server worker with explicit origin bindings.
export const server = await Worker("server", {
  adopt: true, // Adopt existing worker if it already exists in Cloudflare
  cwd: "apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  domains: [SERVER_CUSTOM_DOMAIN],
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
    // CORS origin - uses env in dev, custom domain in production
    CORS_ORIGIN: corsOrigin,
    BETTER_AUTH_SECRET: alchemy.secret(getRuntimeEnv("BETTER_AUTH_SECRET")),
    // OAuth callback URL - uses env in dev, custom domain in production
    BETTER_AUTH_URL: serverUrl,
    ...(authCookieDomain
      ? { BETTER_AUTH_COOKIE_DOMAIN: authCookieDomain }
      : {}),
    ALLOWED_EMAIL: alchemy.secret(getRuntimeEnv("ALLOWED_EMAIL")),
    SPECTRAL_NOTIFY_API_KEY: alchemy.secret(
      getRuntimeEnv("SPECTRAL_NOTIFY_API_KEY")
    ),
    GOOGLE_CLIENT_ID: alchemy.secret(getRuntimeEnv("GOOGLE_CLIENT_ID")),
    GOOGLE_CLIENT_SECRET: alchemy.secret(getRuntimeEnv("GOOGLE_CLIENT_SECRET")),
  },
  dev: {
    port: 8094,
  },
});

// Create web with server URL available at build time
export const web = await Vite("web", {
  adopt: true, // Adopt existing Vite deployment if it already exists in Cloudflare
  cwd: "apps/web",
  assets: "dist",
  compatibility: "node",
  domains: [WEB_CUSTOM_DOMAIN],
  bindings: {
    // Server URL - uses env in dev (via Vite's .env), custom domain in production build
    VITE_SERVER_URL: viteServerUrl,
    VITE_BUILD_ID: webBuildId,
  },
  dev: {
    command: "pnpm run dev",
  },
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
