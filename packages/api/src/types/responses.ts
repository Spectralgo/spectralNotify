/**
 * Idempotency metadata included in all mutation responses
 *
 * This metadata helps clients identify whether a response came from:
 * - Fresh processing (cached: false)
 * - Cached/deduplicated request (cached: true)
 *
 * Example fresh response:
 * ```json
 * {
 *   "success": true,
 *   "taskId": "task-123",
 *   "__idempotency": {
 *     "cached": false,
 *     "key": "a3f8b2c1"
 *   }
 * }
 * ```
 *
 * Example cached response:
 * ```json
 * {
 *   "success": true,
 *   "taskId": "task-123",
 *   "__idempotency": {
 *     "cached": true,
 *     "cachedAt": "2025-10-28T12:34:56.789Z",
 *     "key": "a3f8b2c1"
 *   }
 * }
 * ```
 */
export interface IdempotencyMetadata {
  __idempotency: {
    /** Whether this response was served from cache */
    cached: boolean;

    /** When the response was originally cached (ISO 8601 timestamp) */
    cachedAt?: string;

    /** First 8 characters of the SHA-256 idempotency key for debugging */
    key: string;
  };
}

/**
 * Standard mutation response structure
 *
 * All task mutation endpoints return this shape with required
 * idempotency metadata.
 */
export interface MutationResponse extends IdempotencyMetadata {
  success: boolean;
  taskId: string;
}
