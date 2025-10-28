# SpectralNotify API Endpoints - Quick Reference

## Overview

SpectralNotify exposes three different API surfaces, each with specific use cases:

| Endpoint | Purpose | Idempotency | Use For |
|----------|---------|-------------|---------|
| `/rpc` | oRPC client (TypeScript + HTTP) | ✅ Full Support | **Production integrations** |
| `/tasks/*`, `/counter/*` | OpenAPI REST | ❌ NO Support | Debugging, monitoring |
| `/api-reference` | Documentation UI | N/A | API documentation viewer |

## 1. RPC Endpoint (RECOMMENDED for Production)

### URL
```
POST http://localhost:8094/rpc
```

### Features
- ✅ Full middleware support (idempotency, auth, etc.)
- ✅ Returns `__idempotency` metadata
- ✅ Cached response detection
- ✅ 24-hour automatic cache expiration
- ✅ TypeScript type safety (with oRPC client)

### Request Format
```json
{
  "method": "tasks.create",
  "params": {
    "id": "task-123",
    "status": "pending",
    "metadata": {}
  }
}
```

### Response Format
```json
{
  "success": true,
  "taskId": "task-123",
  "__idempotency": {
    "cached": false,
    "key": "a1b2c3d4"
  }
}
```

### Headers Required
```
Content-Type: application/json
X-API-Key: your-api-key
Idempotency-Key: sha256-deterministic-key
```

### Available Methods
- `tasks.create`
- `tasks.updateProgress`
- `tasks.complete`
- `tasks.fail`
- `tasks.cancel`
- `tasks.getById`
- `tasks.getHistory`
- `tasks.delete`
- `counter.create`
- `counter.increment`
- `counter.decrement`
- `counter.getValue`

### Example: TypeScript Client
```typescript
import { createORPCClient } from "@orpc/client";
import { createFetchLink } from "@orpc/client/fetch";

const client = createORPCClient<AppRouter>({
  links: [
    createFetchLink({
      url: "http://localhost:8094/rpc",
      headers: {
        "X-API-Key": "your-api-key",
        "Idempotency-Key": generateKey(),
      },
    }),
  ],
});

const result = await client.tasks.create({
  id: "task-123",
  status: "pending",
  metadata: {},
});

console.log(result.__idempotency.cached); // false
```

### Example: HTTP Client
```bash
curl -X POST http://localhost:8094/rpc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-key" \
  -H "Idempotency-Key: test-key-001" \
  -d '{
    "method": "tasks.create",
    "params": {
      "id": "task-001",
      "status": "pending",
      "metadata": {}
    }
  }'
```

## 2. REST Endpoints (For Debugging Only)

### URL Pattern
```
POST http://localhost:8094/tasks/{operation}
POST http://localhost:8094/counter/{operation}
```

### Features
- ⚠️ NO middleware support
- ⚠️ NO idempotency
- ⚠️ NO `__idempotency` metadata
- ✅ Simple HTTP POST requests
- ✅ Good for curl debugging

### Request Format
```json
{
  "id": "task-123",
  "status": "pending",
  "metadata": {}
}
```

### Response Format
```json
{
  "success": true,
  "taskId": "task-123"
}
```
⚠️ **Note:** No `__idempotency` field in response!

### Headers Required
```
Content-Type: application/json
X-API-Key: your-api-key
```
⚠️ **Note:** `Idempotency-Key` header has NO effect on REST endpoints!

### Available Endpoints

#### Task Operations
- `POST /tasks/create` - Create new task
- `POST /tasks/updateProgress` - Update task progress
- `POST /tasks/complete` - Mark task complete
- `POST /tasks/fail` - Mark task failed
- `POST /tasks/cancel` - Cancel task
- `POST /tasks/getById` - Get task details
- `POST /tasks/getHistory` - Get task history
- `POST /tasks/delete` - Delete task

#### Counter Operations
- `POST /counter/create` - Create counter
- `POST /counter/increment` - Increment counter
- `POST /counter/decrement` - Decrement counter
- `POST /counter/getValue` - Get counter value

### Example: curl
```bash
curl -X POST http://localhost:8094/tasks/create \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-key" \
  -d '{
    "id": "task-001",
    "status": "pending",
    "progress": 0,
    "metadata": {}
  }'
```

## 3. Documentation UI

### URL
```
GET http://localhost:8094/api-reference
```

### Features
- Interactive OpenAPI documentation
- Try-it-out functionality
- Schema exploration
- Example requests/responses

### Access
Open in browser: [http://localhost:8094/api-reference](http://localhost:8094/api-reference)

## Comparison Table

| Feature | `/rpc` | `/tasks/*` REST |
|---------|--------|-----------------|
| **Authentication** | ✅ X-API-Key | ✅ X-API-Key |
| **Idempotency Middleware** | ✅ YES | ❌ NO |
| **`__idempotency` Metadata** | ✅ YES | ❌ NO |
| **Cached Response Detection** | ✅ YES | ❌ NO |
| **TypeScript Types** | ✅ Full | ⚠️ Manual |
| **Input Validation** | ✅ Zod | ✅ Zod |
| **Error Handling** | ✅ Typed | ✅ Typed |
| **WebSocket Support** | ❌ NO* | ❌ NO* |
| **Production Ready** | ✅ YES | ⚠️ NO |

*WebSocket connections use separate endpoints: `/ws/task/:taskId` and `/ws/counter/:name`

## When to Use Each Endpoint

### Use `/rpc` When:
- ✅ Building production integration
- ✅ Need idempotency guarantees
- ✅ Want cached response detection
- ✅ Using retry logic
- ✅ Need deterministic behavior
- ✅ Have TypeScript codebase (can use oRPC client)

### Use `/tasks/*` REST When:
- ⚠️ Quick debugging with curl
- ⚠️ Testing endpoints manually
- ⚠️ External monitoring tools (read-only)
- ⚠️ Non-critical operations
- ⚠️ Cannot use RPC format

### Use `/api-reference` When:
- 📖 Exploring API capabilities
- 📖 Understanding request/response schemas
- 📖 Generating client code
- 📖 Onboarding new developers

## Migration Guide

If you're currently using REST endpoints (`/tasks/*`) and want to migrate to RPC:

### Before (REST - NO Idempotency)
```typescript
await fetch(`${baseUrl}/tasks/create`, {
  method: "POST",
  headers: {
    "X-API-Key": apiKey,
    "Idempotency-Key": key, // ❌ Ignored!
  },
  body: JSON.stringify({ id, status, metadata }),
});
```

### After (RPC - Full Idempotency)
```typescript
await fetch(`${baseUrl}/rpc`, {
  method: "POST",
  headers: {
    "X-API-Key": apiKey,
    "Idempotency-Key": key, // ✅ Works!
  },
  body: JSON.stringify({
    method: "tasks.create",
    params: { id, status, metadata },
  }),
});
```

### Key Changes
1. URL: `/tasks/create` → `/rpc`
2. Add `method` field: `"tasks.create"`
3. Wrap params: `{...}` → `{ params: {...} }`
4. Check response: `data.__idempotency.cached`

## Testing Checklist

After switching to `/rpc`:

- [ ] Test with valid API key
- [ ] Test with invalid API key (expect 401)
- [ ] Test with missing Idempotency-Key (expect 400)
- [ ] Test duplicate request (expect cached response)
- [ ] Verify `__idempotency.cached: false` on first request
- [ ] Verify `__idempotency.cached: true` on duplicate
- [ ] Verify `__idempotency.key` matches first 8 chars
- [ ] Check cache expires after 24 hours
- [ ] Test all methods (create, update, complete, fail, cancel)
- [ ] Monitor cache hit rate in logs

## Support

For integration assistance:
- 📖 [SpectralTranscript Integration Guide](./integration/SPECTRAL_TRANSCRIPT_INTEGRATION.md)
- 📖 [Full Integration Documentation](./integration/README.md)
- 📖 [API Reference](./api/README.md)
- 🌐 [oRPC Documentation](https://orpc.unnoq.com/)

For issues or questions, check server logs for `[Idempotency]` messages and verify request format matches examples above.
