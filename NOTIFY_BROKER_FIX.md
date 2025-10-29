# NotifyBroker Communication Fix

## Issue Summary
The NotifyBroker in spectralTranscript was failing to communicate with spectralNotify server, throwing "Unexpected end of JSON input" errors during JSON parsing of API responses.

## Root Cause
The spectralNotify server was incorrectly re-wrapping Response objects using `c.newResponse(response.body, response)`, which consumed the Response body stream. Since ReadableStream bodies can only be consumed once, this left an empty body for clients, causing JSON.parse() to fail.

## Changes Made

### 1. Fixed Response Stream Consumption (apps/server/src/index.ts)
**Lines Changed:** 150, 160, 170

**Before:**
```typescript
if (restResult.matched) {
  return c.newResponse(restResult.response.body, restResult.response);
}
```

**After:**
```typescript
if (restResult.matched) {
  return restResult.response;
}
```

**Rationale:** The OpenAPIHandler and RPCHandler already return complete Response objects with intact bodies. Re-wrapping them was consuming the stream and leaving an empty body.

### 2. Added Output Schemas for Type Safety (packages/api/src/routers/tasks/tasks.router.ts)
**Lines Added:** 80-108, and output declarations at lines 344, 373, 402, 432

Added proper Zod schemas for:
- `taskMetadataResponseSchema` - Task metadata from Durable Objects
- `taskHistoryResponseSchema` - Task event history
- `enrichedTaskResponseSchema` - Combined response type

Applied `.output(withIdempotencySchema(enrichedTaskResponseSchema))` to:
- `tasks.updateProgress`
- `tasks.complete`
- `tasks.fail`
- `tasks.cancel`

**Rationale:** These endpoints return `EnrichedTaskResponse` but lacked explicit output schemas for OpenAPI documentation and type safety. This ensures proper API contract definition and idempotency metadata handling.

### 3. Minor Fix (apps/server/src/index.ts)
**Line 36:** Added explicit type annotation `(o: string)` to fix TypeScript linting error.

## Impact

### Before Fix
```
[NotifyBroker] Attempt 1/4 failed (error), retrying in 1000ms...
[NotifyBroker] Attempt 2/4 failed (error), retrying in 2000ms...
[NotifyBroker] Attempt 3/4 failed (error), retrying in 4000ms...
[NotifyBroker] Failed to notify progress: Error: Failed after 4 attempts (key: 43010e08): Unexpected end of JSON input
[NotifyBroker] Circuit breaker opened after 5 consecutive failures
```

### After Fix
- ✅ JSON responses properly parsed by NotifyBroker
- ✅ Idempotency metadata flows correctly
- ✅ Circuit breaker no longer triggers
- ✅ Real-time task progress updates work as designed
- ✅ Complete OpenAPI documentation with proper response schemas

## Testing
1. Build succeeds for @spectralNotify/api package
2. All TypeScript types compile correctly
3. Idempotency middleware properly attaches `__idempotency` metadata
4. Response bodies remain intact through handler chain

## Files Modified
1. `/Users/spectralgo/code/spectralNotify/apps/server/src/index.ts` (4 lines changed)
2. `/Users/spectralgo/code/spectralNotify/packages/api/src/routers/tasks/tasks.router.ts` (33 lines added)

## Related Documentation
- SpectralNotify API Contract: `ai_docs/project_plan/notify_broker/SPECTRAL_NOTIFY_API_CONTRACT.md`
- API Endpoints Summary: `apps/server/docs/API_ENDPOINTS_SUMMARY.md`
- Integration Guide: `apps/server/docs/integration/SPECTRAL_TRANSCRIPT_INTEGRATION.md`

