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
export { Workflow } from "./workflow";

type Env = {
  CORS_ORIGIN: string;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  ALLOWED_EMAIL: string;
  SPECTRAL_NOTIFY_API_KEY: string;
  BUILD_ID: string;
  DB: D1Database;
  COUNTER: DurableObjectNamespace;
  TASK: DurableObjectNamespace;
  WORKFLOW: DurableObjectNamespace;
};

const app = new Hono<{ Bindings: Env }>();

app.use(logger());

// Permissive CORS for WebSocket routes - external apps can connect freely
// WebSocket security is handled by the protocol itself, not CORS
app.use(
  "/ws/*",
  cors({
    origin: (origin) => {
      // Allow any origin for WebSocket connections
      // Non-browser clients don't send Origin header
      // Browser clients are allowed from any origin
      return origin || "*";
    },
    allowMethods: ["GET", "OPTIONS"],
    allowHeaders: ["Upgrade", "Connection", "Sec-WebSocket-Key", "Sec-WebSocket-Version", "Sec-WebSocket-Protocol"],
    credentials: false, // WebSocket doesn't use cookies
  })
);

// Standard CORS for REST API and other routes
app.use(
  "/*",
  cors({
    origin: (origin, c) => {
      const corsOrigin = c.env.CORS_ORIGIN;
      // Parse comma-separated origins
      const allowedOrigins = corsOrigin
        ? corsOrigin.split(",").map((o: string) => o.trim())
        : [];

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

      // For API key authenticated requests, allow any origin
      // This enables external apps to call the API with their API key
      // The actual authorization is handled by the API key check in middleware
      return origin || "*";
    },
    allowMethods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-API-Key",
      "Idempotency-Key",
    ],
    credentials: true,
    exposeHeaders: ["X-Request-Id"],
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
  const path = c.req.path;

  // Skip middleware processing for WebSocket upgrade requests
  // They are handled directly by the /ws/* routes without authentication
  if (path.startsWith("/ws/") && headers.get("Upgrade") === "websocket") {
    return next();
  }

  console.log(`[Middleware] Processing ${c.req.method} ${path}`);

  // Check API key (supports X-API-Key and Authorization: Bearer <key>)
  const headerApiKey = headers.get("X-API-Key") || undefined;
  console.log(
    `[Middleware] X-API-Key header: ${headerApiKey ? "present" : "missing"}`
  );
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
  const serviceSession =
    providedKey && expectedKey && providedKey === expectedKey
      ? ({ user: { id: "service", name: "Notify Service" } } as unknown)
      : null;

  const session = (userSession || serviceSession) as
    | typeof auth.$Infer.Session
    | null;

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

  console.log(`[Context] session: ${session ? "present" : "null"}`);
  console.log(`[Context] session.user: ${session?.user ? "present" : "null"}`);
  console.log(`[Context] apiKeyAuthorized: ${context.apiKeyAuthorized}`);

  // 1. Try REST endpoints first (/tasks/*, /counter/*, etc.)
  const restResult = await restHandler.handle(c.req.raw, {
    prefix: "/",
    context,
  });

  if (restResult.matched) {
    // Debug response body to diagnose empty JSON issue
    try {
      const clone = restResult.response.clone();
      const text = await clone.text();
      console.log("[DEBUG] REST response status:", restResult.response.status);
      console.log("[DEBUG] REST response body length:", text.length);
      if (text.length > 0) {
        console.log("[DEBUG] REST response preview:", text.slice(0, 200));
      } else {
        console.log("[DEBUG] REST response is empty body");
      }
    } catch (e) {
      console.log("[DEBUG] Failed to read REST response body:", e);
    }
    return restResult.response;
  }

  // 2. Try RPC endpoints (/rpc)
  const rpcResult = await rpcHandler.handle(c.req.raw, {
    prefix: "/rpc",
    context,
  });

  if (rpcResult.matched) {
    return rpcResult.response;
  }

  // 3. Try documentation (/api-reference)
  const docsResult = await docsHandler.handle(c.req.raw, {
    prefix: "/api-reference",
    context,
  });

  if (docsResult.matched) {
    return docsResult.response;
  }

  await next();
});

app.get("/", (c) => c.text("OK"));
app.get("/__version", (c) => c.json({ buildId: c.env.BUILD_ID }));

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

// WebSocket upgrade endpoint for Workflow Durable Objects
// This proxies the WebSocket connection directly to the appropriate Workflow DO
app.get("/ws/workflow/:workflowId", async (c) => {
  const workflowId = c.req.param("workflowId");

  // Validate that this is a WebSocket upgrade request
  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("Expected WebSocket upgrade", 426);
  }

  // Get the Workflow Durable Object stub by workflowId
  const workflowDoId = c.env.WORKFLOW.idFromName(workflowId);
  const workflowStub = c.env.WORKFLOW.get(workflowDoId);

  // Forward the request to the Durable Object
  // The DO's fetch() handler will handle the WebSocket upgrade
  return workflowStub.fetch(c.req.raw);
});

export default app;
