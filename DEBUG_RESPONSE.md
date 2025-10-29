# Debug: Response Body Issue

## Problem
Even after fixing `c.newResponse()` wrapping, responses still have empty bodies.

## Hypothesis
The issue might be that:
1. Multiple Alchemy dev servers are running simultaneously (causing port/resource conflicts)
2. TypeScript source changes aren't being hot-reloaded properly
3. There's a deeper issue with how OpenAPIHandler serializes responses

## Next Steps to Debug

### 1. Kill ALL old Alchemy processes
```bash
cd /Users/spectralgo/code/spectralNotify
pkill -f "alchemy.*spectralNotify"
pkill -f "tsx.*alchemy.run.ts"
```

### 2. Clean and Rebuild Everything
```bash
cd /Users/spectralgo/code/spectralNotify
rm -rf node_modules/.cache
rm -rf .alchemy
rm -rf apps/server/dist
rm -rf packages/api/dist
pnpm install
pnpm build
```

### 3. Start Fresh Dev Server
```bash
cd /Users/spectralgo/code/spectralNotify
pnpm dev
```

### 4. Test with curl
Once server is running, test directly:
```bash
curl -X POST http://localhost:8094/tasks/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-key-12345" \
  -H "Idempotency-Key: test-curl-$(date +%s)" \
  -d '{"id":"TASK-CURL001","status":"in-progress","progress":0,"metadata":{"test":"curl"}}' \
  -v
```

Expected response body:
```json
{
  "success": true,
  "taskId": "TASK-CURL001",
  "__idempotency": {
    "cached": false,
    "key": "abcd1234"
  }
}
```

If body is empty, the issue is in the server code itself.
If body has content, the issue is in NotifyBroker's fetch configuration.

## Alternative: Check if OpenAPIHandler needs explicit serialization

The OpenAPIHandler might not be properly serializing the response. We may need to add explicit JSON serialization:

```typescript
if (restResult.matched) {
  // Try explicitly cloning the response
  const responseBody = await restResult.response.text();
  return c.json(JSON.parse(responseBody), restResult.response.status);
}
```

Or check if we need to configure OpenAPIHandler differently:

```typescript
export const restHandler = new OpenAPIHandler(appRouter, {
  interceptors: [
    onError((error) => {
      console.error(error);
    }),
  ],
  // Maybe needs explicit serialization config?
});
```

## Check Response Object Structure

Add debug logging to see what restResult.response actually contains:

```typescript
if (restResult.matched) {
  console.log('[DEBUG] Response status:', restResult.response.status);
  console.log('[DEBUG] Response headers:', Object.fromEntries(restResult.response.headers.entries()));
  console.log('[DEBUG] Response body type:', restResult.response.body?.constructor.name);
  
  // Clone and log body
  const clone = restResult.response.clone();
  const text = await clone.text();
  console.log('[DEBUG] Response body:', text);
  
  return restResult.response;
}
```

This will show us if the body is actually empty at this point or if it gets lost later.

