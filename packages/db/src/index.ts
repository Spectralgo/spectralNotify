import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";

export const db = drizzle(env.DB);

// Export schemas
export * from "./schema/auth";
export * from "./schema/counter-registry";
export * from "./schema/idempotency-keys";
export * from "./schema/task-registry";
