import { D1Database, DurableObjectNamespace, Worker } from "alchemy/cloudflare";
export declare const server: Worker<
  {
    readonly DB: D1Database;
    readonly COUNTER: DurableObjectNamespace<any>;
    readonly CORS_ORIGIN: "";
    readonly BETTER_AUTH_SECRET: import("alchemy").Secret<string>;
    readonly BETTER_AUTH_URL: "";
    readonly ALLOWED_EMAIL: import("alchemy").Secret<string>;
  },
  Rpc.WorkerEntrypointBranded
>;
export declare const web: Worker<
  {
    VITE_SERVER_URL: string;
  } & {
    ASSETS: import("alchemy/cloudflare").Assets;
  }
>;
