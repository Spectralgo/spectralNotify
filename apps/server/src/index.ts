import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { OpenAPIReferencePlugin } from "@orpc/openapi/plugins";
import { onError } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { appRouter } from "@spectralNotify/api/routers/index";
import { auth } from "@spectralNotify/auth";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Export Durable Objects
export { Counter } from "./counter";
export { Task } from "./task";

type Env = {
  CORS_ORIGIN: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  ALLOWED_EMAIL: string;
  SPECTRAL_NOTIFY_API_KEY: string;
  DB: D1Database;
  COUNTER: DurableObjectNamespace;
  TASK: DurableObjectNamespace;
};

const app = new Hono<{ Bindings: Env }>();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: (origin, c) => {
      const corsOrigin = c.env.CORS_ORIGIN;
      // Parse comma-separated origins
      const allowedOrigins = corsOrigin ? corsOrigin.split(",").map(o => o.trim()) : [];

      // In development, allow localhost origins
      if (origin) {
        if (
          origin.startsWith("http://localhost:") ||
          origin.startsWith("http://127.0.0.1:") ||
          origin.startsWith("exp://")
        ) {
          return origin;
        }
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          return origin;
        }
      }
      // Fallback to wildcard if no specific origins configured
      return allowedOrigins.length > 0 ? allowedOrigins[0] : "*";
    },
    allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key", "Idempotency-Key"],
    credentials: true,
  })
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Documentation handler (serves API reference UI at /api-reference)
export const docsHandler = new OpenAPIHandler(appRouter, {
  plugins: [
    new OpenAPIReferencePlugin({
      schemaConverters: [new ZodToJsonSchemaConverter()],
    }),
  ],
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

// REST API handler (serves OpenAPI-compliant endpoints at /tasks/*, /counter/*, etc.)
export const restHandler = new OpenAPIHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

export const rpcHandler = new RPCHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
});

app.use("/*", async (c, next) => {
  const headers = c.req.raw.headers;
  console.log(`[Middleware] Processing ${c.req.method} ${c.req.path}`);

  // Check API key (supports X-API-Key and Authorization: Bearer <key>)
  const headerApiKey = headers.get("X-API-Key") || undefined;
  console.log(`[Middleware] X-API-Key header: ${headerApiKey ? 'present' : 'missing'}`);
  const authHeader = headers.get("Authorization") || "";
  const bearerMatch = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : undefined;
  const providedKey = headerApiKey || bearerMatch;
  const expectedKey = c.env.SPECTRAL_NOTIFY_API_KEY;

  // Debug logging
  if (providedKey) {
    console.log(`[Auth] API Key provided: ${providedKey?.substring(0, 8)}...`);
    console.log(`[Auth] Expected key: ${expectedKey?.substring(0, 8)}...`);
    console.log(`[Auth] Keys match: ${providedKey === expectedKey}`);
  }

  // Determine session: prefer user session; otherwise accept valid API key as service session
  const userSession = await auth.api.getSession({ headers });
  const serviceSession = providedKey && expectedKey && providedKey === expectedKey
    ? ({ user: { id: "service", name: "Notify Service" } } as unknown)
    : null;

  const session = (userSession || serviceSession) as typeof auth.$Infer.Session | null;

  if (serviceSession) {
    console.log("[Auth] Using service session (API key validated)");
  } else if (userSession) {
    console.log("[Auth] Using user session");
  } else {
    console.log("[Auth] No valid authentication");
  }

  // Pass env bindings and session directly as context
  const context = {
    session,
    headers: c.req.raw.headers,
    apiKeyAuthorized: Boolean(serviceSession),
    ...c.env, // Spread all env bindings (DB, COUNTER, TASK, etc.)
  };

  console.log(`[Context] session: ${session ? 'present' : 'null'}`);
  console.log(`[Context] session.user: ${session?.user ? 'present' : 'null'}`);
  console.log(`[Context] apiKeyAuthorized: ${context.apiKeyAuthorized}`);

  // 1. Try REST endpoints first (/tasks/*, /counter/*, etc.)
  const restResult = await restHandler.handle(c.req.raw, {
    prefix: "/",
    context,
  });

  if (restResult.matched) {
    return c.newResponse(restResult.response.body, restResult.response);
  }

  // 2. Try RPC endpoints (/rpc)
  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    return c.newResponse(rpcResult.response.body, rpcResult.response);
  }

  // 3. Try documentation (/api-reference)
  const docsResult = await docsHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context,
  });

  if (docsResult.matched) {
    return c.newResponse(docsResult.response.body, docsResult.response);
  }

  await next();
});

app.get("/", (c) => c.text("OK"));

// WebSocket upgrade endpoint for Counter Durable Objects
// This proxies the WebSocket connection directly to the appropriate Counter DO
app.get("/ws/counter/:name", async (c) => {
  const counterName = c.req.param("name");

  // Validate that this is a WebSocket upgrade request
  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("Expected WebSocket upgrade", 426);
  }

  // Get the Counter Durable Object stub by name
  const counterId = c.env.COUNTER.idFromName(counterName);
  const counterStub = c.env.COUNTER.get(counterId);

  // Forward the request to the Durable Object
  // The DO's fetch() handler will handle the WebSocket upgrade
  return counterStub.fetch(c.req.raw);
});

// WebSocket upgrade endpoint for Task Durable Objects
// This proxies the WebSocket connection directly to the appropriate Task DO
app.get("/ws/task/:taskId", async (c) => {
  const taskId = c.req.param("taskId");

  // Validate that this is a WebSocket upgrade request
  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("Expected WebSocket upgrade", 426);
  }

  // Get the Task Durable Object stub by taskId
  const taskDoId = c.env.TASK.idFromName(taskId);
  const taskStub = c.env.TASK.get(taskDoId);

  // Forward the request to the Durable Object
  // The DO's fetch() handler will handle the WebSocket upgrade
  return taskStub.fetch(c.req.raw);
});

export default app;
