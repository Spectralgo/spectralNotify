import type { auth } from "@spectralNotify/auth";

export type Session = typeof auth.$Infer.Session;

export type Context = {
  session: Session | null;
  headers: Headers;
  DB: D1Database;
  COUNTER: DurableObjectNamespace;
  TASK: DurableObjectNamespace;
  CORS_ORIGIN: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  ALLOWED_EMAIL: string;
  SPECTRAL_NOTIFY_API_KEY: string;
  apiKeyAuthorized?: boolean;
};
