import alchemy from "alchemy";
import { D1Database, Vite, Worker } from "alchemy/cloudflare";
import { Exec } from "alchemy/os";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "./apps/web/.env" });
config({ path: "./apps/server/.env" });

const app = await alchemy("spectral-notify");

await Exec("db-generate", {
  cwd: "packages/db",
  command: "pnpm run db:generate",
});

const db = await D1Database("database", {
  migrationsDir: "packages/db/src/migrations",
});

// Create server first to get its URL for the web build
export const server = await Worker("server", {
  cwd: "apps/server",
  entrypoint: "src/index.ts",
  compatibility: "node",
  bindings: {
    DB: db,
    CORS_ORIGIN: "",
    BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET),
    BETTER_AUTH_URL: "",
    ALLOWED_EMAIL: alchemy.secret(process.env.ALLOWED_EMAIL),
  },
  dev: {
    port: 8094,
  },
});

// Create web with server URL available at build time
export const web = await Vite("web", {
  cwd: "apps/web",
  assets: "dist",
  bindings: {
    VITE_SERVER_URL: server.url,
  },
  dev: {
    command: "pnpm run dev",
  },
});

// Update server CORS after web is created
server.bindings.CORS_ORIGIN = web.url;
server.bindings.BETTER_AUTH_URL = server.url;

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
