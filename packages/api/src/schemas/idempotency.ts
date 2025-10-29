import z from "zod";

/**
 * Idempotency metadata schema for responses
 *
 * This schema defines the structure of the `__idempotency` field
 * that is automatically added to mutation responses by the idempotency middleware.
 */
export const idempotencyMetadataSchema = z.object({
  /** Whether this response was served from cache */
  cached: z.boolean(),

  /** When the response was originally cached (ISO 8601 timestamp) - only present when cached=true */
  cachedAt: z.string().optional(),

  /** First 8 characters of the SHA-256 idempotency key for debugging */
  key: z.string(),
});

/**
 * Helper to wrap a response schema with idempotency metadata
 *
 * Usage:
 * ```typescript
 * const createResponseSchema = withIdempotency(z.object({
 *   success: z.boolean(),
 *   taskId: z.string(),
 * }));
 * ```
 *
 * @param baseSchema - The base response schema
 * @returns Extended schema with optional __idempotency field
 *
 * Note: __idempotency is marked as optional because it's added by middleware AFTER
 * the handler validates. The middleware will always add it for mutation responses.
 */
export function withIdempotency<T extends z.ZodRawShape>(
  baseSchema: z.ZodObject<T>
): z.ZodObject<
  T & { __idempotency: z.ZodOptional<typeof idempotencyMetadataSchema> }
> {
  return baseSchema.extend({
    __idempotency: idempotencyMetadataSchema.optional(),
  });
}
