import alchemy from "alchemy";
import { Vite } from "alchemy/cloudflare";
import { Worker } from "alchemy/cloudflare";
import { D1Database } from "alchemy/cloudflare";
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

// Create web first to get its URL
export const web = await Vite("web", {
	cwd: "apps/web",
	assets: "dist",
	compatibility: "node",
	bindings: {
		VITE_SERVER_URL: "",
	},
	dev: {
		command: "pnpm run dev",
	},
});

export const server = await Worker("server", {
	cwd: "apps/server",
	entrypoint: "src/index.ts",
	compatibility: "node",
	bindings: {
		DB: db,
		CORS_ORIGIN: web.url,
		BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET),
		BETTER_AUTH_URL: "",
		ALLOWED_EMAIL: alchemy.secret(process.env.ALLOWED_EMAIL),
	},
	dev: {
		port: 8094,
	},
});

// Update web binding with server URL after server is created
web.bindings.VITE_SERVER_URL = server.url;
server.bindings.BETTER_AUTH_URL = server.url;

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

await app.finalize();
