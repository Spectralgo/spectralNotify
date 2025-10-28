import { ORPCError } from "@orpc/server";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { idempotencyKeys } from "@spectralNotify/db";
import { o } from "../orpc";

/**
 * Idempotency Middleware
 *
 * Prevents duplicate mutations by requiring and caching idempotency keys.
 *
 * How it works:
 * 1. Requires Idempotency-Key header (throws error if missing)
 * 2. If key exists and not expired, returns cached response
 * 3. If key is new, processes request and stores response
 * 4. Keys expire after 24 hours
 *
 * Usage:
 * ```typescript
 * const createEndpoint = apiKeyProcedure
 *   .use(withIdempotency)
 *   .handler(async ({ input, context }) => {
 *     // Your logic here
 *   });
 * ```
 */
export const withIdempotency = o.middleware(async ({ context, next }) => {
  const idempotencyKey = context.headers?.get("Idempotency-Key");

  // Require idempotency key for all mutation requests
  if (!idempotencyKey) {
    throw new ORPCError("BAD_REQUEST");
  }

  const database = drizzle(context.DB, {
    schema: { idempotencyKeys },
  });

  // Clean up expired keys (24h expiration)
  const now = new Date().toISOString();
  await database
    .delete(idempotencyKeys)
    .where(sql`${idempotencyKeys.expiresAt} < ${now}`);

  // Check if this idempotency key has been processed before
  const existing = await database
    .select()
    .from(idempotencyKeys)
    .where(
      and(
        eq(idempotencyKeys.key, idempotencyKey),
        sql`${idempotencyKeys.expiresAt} >= ${now}`
      )
    )
    .get();

  // If key exists and not expired, return cached response with metadata
  if (existing) {
    console.log(`[Idempotency] Returning cached response for key: ${idempotencyKey.substring(0, 8)}...`);
    const cachedResponse = JSON.parse(existing.response);
    return {
      ...cachedResponse,
      __idempotency: {
        cached: true,
        cachedAt: existing.createdAt,
        key: idempotencyKey.substring(0, 8),
      }
    };
  }

  // Process the request
  console.log(`[Idempotency] Processing new key: ${idempotencyKey.substring(0, 8)}...`);
  const middlewareResult = await next({ context });

  // Extract the actual output from the middleware result
  const handlerOutput = middlewareResult.output || middlewareResult;

  // Store the response with 24h expiration (store CLEAN response without metadata)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  try {
    await database.insert(idempotencyKeys).values({
      key: idempotencyKey,
      response: JSON.stringify(handlerOutput), // Store clean output without metadata
      endpoint: context.headers?.get("X-Endpoint-Name") || "unknown",
      createdAt: now,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    // If insertion fails (race condition), that's okay - we still return the result
    console.warn(`[Idempotency] Failed to store key: ${error}`);
  }

  // Return response with metadata (merge with handler output only)
  return {
    ...handlerOutput,
    __idempotency: {
      cached: false,
      key: idempotencyKey.substring(0, 8),
    }
  };
});
