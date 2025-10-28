# SpectralTranscript NotifyBroker Integration Guide

## Executive Summary

**IMPORTANT**: SpectralTranscript should use the **`/rpc` endpoint**, NOT the `/tasks/*` REST endpoints, to get full idempotency support with `__idempotency` metadata in responses.

## Why Use `/rpc` Instead of REST?

### The Problem with REST Endpoints (`/tasks/*`)

oRPC middleware (including `withIdempotency`) **only executes for RPC endpoints**, not for OpenAPI REST endpoints. This is a fundamental limitation of the oRPC framework.

**What works with REST:**
- ✅ Basic CRUD operations
- ✅ API key authentication
- ✅ Input validation

**What DOESN'T work with REST:**
- ❌ Idempotency middleware
- ❌ `__idempotency` metadata in responses
- ❌ Cached response detection
- ❌ Automatic duplicate request handling

### The Solution: Use `/rpc` Endpoint

The `/rpc` endpoint provides:
- ✅ Full idempotency middleware support
- ✅ `__idempotency` metadata in ALL mutation responses
- ✅ Cached response detection via `cached: true`
- ✅ 24-hour automatic cache expiration
- ✅ Deterministic key support (SHA-256)

## Integration Options

### Option 1: oRPC Client (Recommended for TypeScript)

If SpectralTranscript can use an oRPC TypeScript client:

```typescript
import { createORPCClient } from "@orpc/client";
import { createFetchLink } from "@orpc/client/fetch";
import type { AppRouter } from "@spectralNotify/api";

const client = createORPCClient<AppRouter>({
  links: [
    createFetchLink({
      url: `${SPECTRAL_NOTIFY_URL}/rpc`,
      headers: {
        "X-API-Key": process.env.SPECTRAL_NOTIFY_API_KEY,
        "Idempotency-Key": generateIdempotencyKey(endpoint, body),
      },
    }),
  ],
});

// Create task with full idempotency support
const result = await client.tasks.create({
  id: taskId,
  status: "pending",
  progress: 0,
  metadata: { source: "youtube-download" },
});

// Response includes idempotency metadata
console.log(result.__idempotency);
// {
//   cached: false,
//   key: "a1b2c3d4",
// }
```

### Option 2: Manual RPC Format (For HTTP-only clients)

If SpectralTranscript cannot use oRPC client dependencies, use this HTTP format:

#### Request Format

```http
POST http://localhost:8094/rpc HTTP/1.1
Content-Type: application/json
X-API-Key: local-dev-key
Idempotency-Key: <sha256-deterministic-key>

{
  "method": "tasks.create",
  "params": {
    "id": "task-123",
    "status": "pending",
    "progress": 0,
    "metadata": {
      "source": "youtube-download"
    }
  }
}
```

#### Response Format

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

#### Cached Response Example

When the same `Idempotency-Key` is sent again:

```json
{
  "success": true,
  "taskId": "task-123",
  "__idempotency": {
    "cached": true,
    "cachedAt": "2025-10-28T05:30:00.000Z",
    "key": "a1b2c3d4"
  }
}
```

## NotifyBroker Implementation Changes

### Current Implementation (REST - NO Idempotency)

```typescript
// ❌ This does NOT get idempotency support
private async fetchAsync<T>(endpoint: string, body: Record<string, unknown>) {
  const idempotencyKey = this.generateIdempotencyKey(endpoint, body);

  const response = await fetch(`${this.baseUrl}/tasks/create`, {
    method: "POST",
    headers: {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  // data.__idempotency is UNDEFINED (middleware didn't run)
  return data;
}
```

### Recommended Implementation (RPC - Full Idempotency)

```typescript
// ✅ This gets full idempotency support
private async fetchAsync<T>(
  method: string, // e.g., "tasks.create"
  params: Record<string, unknown>
): Promise<T & IdempotencyMetadata> {
  const idempotencyKey = this.generateIdempotencyKey(method, params);

  const response = await fetch(`${this.baseUrl}/rpc`, {
    method: "POST",
    headers: {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      method, // "tasks.create", "tasks.updateProgress", etc.
      params, // The actual request parameters
    }),
  });

  const data = await response.json() as T & IdempotencyMetadata;

  // Check if response was cached
  if (data.__idempotency?.cached) {
    this.cacheHits++;
    console.log(
      `[NotifyBroker] Cached response for ${method} ` +
      `(key: ${data.__idempotency.key}, cached at: ${data.__idempotency.cachedAt})`
    );
  } else {
    this.cacheMisses++;
  }

  return data;
}
```

### Method Mapping

Update all NotifyBroker methods to use RPC format:

```typescript
async notifyDownloadStartedAsync(task: DownloadTask): Promise<void> {
  const spectralTask = convertToSpectralNotifyTask(task);

  // Use "tasks.create" method instead of "/tasks/create" path
  await this.fetchAsync("tasks.create", {
    id: spectralTask.id,
    status: spectralTask.status,
    progress: 0,
    metadata: spectralTask.metadata,
  });
}

async notifyProgressUpdateAsync(taskId: string, progress: number): Promise<void> {
  // Use "tasks.updateProgress" method instead of "/tasks/updateProgress" path
  await this.fetchAsync("tasks.updateProgress", {
    taskId: formatSpectralNotifyTaskId(taskId),
    progress,
  });
}

async notifyDownloadCompletedAsync(task: DownloadTask): Promise<void> {
  // Use "tasks.complete" method instead of "/tasks/complete" path
  await this.fetchAsync("tasks.complete", {
    taskId: formatSpectralNotifyTaskId(task.id),
    metadata: {
      filePath: task.filePath,
      completedAt: new Date(),
    },
  });
}

async notifyDownloadFailedAsync(taskId: string, error: string): Promise<void> {
  // Use "tasks.fail" method instead of "/tasks/fail" path
  await this.fetchAsync("tasks.fail", {
    taskId: formatSpectralNotifyTaskId(taskId),
    error,
    metadata: { failedAt: new Date() },
  });
}

async notifyDownloadCancelledAsync(taskId: string): Promise<void> {
  // Use "tasks.cancel" method instead of "/tasks/cancel" path
  await this.fetchAsync("tasks.cancel", {
    taskId: formatSpectralNotifyTaskId(taskId),
    metadata: { cancelledAt: new Date() },
  });
}
```

### Updated Deterministic Key Generation

No changes needed - the existing SHA-256 implementation works perfectly:

```typescript
private generateIdempotencyKey(
  method: string, // Changed from "endpoint" to "method"
  params: Record<string, unknown> // Changed from "body" to "params"
): string {
  const sortKeys = (obj: unknown): unknown => {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(sortKeys);
    return Object.keys(obj)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = sortKeys((obj as Record<string, unknown>)[key]);
        return sorted;
      }, {} as Record<string, unknown>);
  };

  const sortedData = {
    method, // e.g., "tasks.create"
    params: sortKeys(params),
  };

  const signature = JSON.stringify(sortedData);
  return crypto.createHash("sha256").update(signature).digest("hex");
}
```

## Testing the Integration

### Test 1: Create Task with Idempotency

```bash
curl -X POST http://localhost:8094/rpc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-key" \
  -H "Idempotency-Key: test-key-12345" \
  -d '{
    "method": "tasks.create",
    "params": {
      "id": "test-task-001",
      "status": "pending",
      "progress": 0,
      "metadata": {"test": true}
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "taskId": "test-task-001",
  "__idempotency": {
    "cached": false,
    "key": "test-key"
  }
}
```

### Test 2: Duplicate Request (Cached)

Send the SAME request again with the SAME `Idempotency-Key`:

```bash
curl -X POST http://localhost:8094/rpc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-key" \
  -H "Idempotency-Key: test-key-12345" \
  -d '{
    "method": "tasks.create",
    "params": {
      "id": "test-task-001",
      "status": "pending",
      "progress": 0,
      "metadata": {"test": true}
    }
  }'
```

**Expected Response (cached):**
```json
{
  "success": true,
  "taskId": "test-task-001",
  "__idempotency": {
    "cached": true,
    "cachedAt": "2025-10-28T05:30:00.000Z",
    "key": "test-key"
  }
}
```

### Test 3: Progress Update

```bash
curl -X POST http://localhost:8094/rpc \
  -H "Content-Type: application/json" \
  -H "X-API-Key: local-dev-key" \
  -H "Idempotency-Key: progress-key-001" \
  -d '{
    "method": "tasks.updateProgress",
    "params": {
      "taskId": "test-task-001",
      "progress": 50
    }
  }'
```

## Benefits of This Approach

### 1. True Idempotency
- Duplicate requests return cached responses in <5ms
- No duplicate database writes
- No duplicate Durable Object operations

### 2. Cache Detection
- `__idempotency.cached: true` indicates cached response
- SpectralTranscript can log/track cache hit rates
- Helps with debugging and monitoring

### 3. Deterministic Keys
- Same operation = same key (SHA-256)
- Network retries are truly idempotent
- Works perfectly with SpectralTranscript's existing key generation

### 4. 24-Hour Expiration
- Automatic cleanup of old keys
- No manual cache management needed
- Prevents indefinite cache growth

## Migration Checklist

- [ ] Update `NotifyBroker.fetchAsync()` to use `/rpc` endpoint
- [ ] Change from `endpoint` to `method` in request format
- [ ] Wrap parameters in `params` object
- [ ] Update all 5 notification methods (started, progress, completed, failed, cancelled)
- [ ] Update idempotency key generation to use `method` instead of `endpoint`
- [ ] Add `__idempotency` metadata type to response interfaces
- [ ] Update cache hit/miss tracking logic
- [ ] Test all endpoints with duplicate requests
- [ ] Verify cached responses work correctly
- [ ] Update error handling for RPC format

## REST Endpoints: When to Use

The REST endpoints (`/tasks/*`) are still available and useful for:

### ✅ Good Use Cases
- Quick debugging/testing with curl
- External monitoring tools
- Read-only operations (getById, getHistory)
- Non-critical batch operations
- Systems that can't use RPC format

### ❌ Bad Use Cases
- Critical mutations (create, update, complete, fail, cancel)
- Operations requiring idempotency guarantees
- Operations needing cache detection
- Production integration with retry logic

## Support and Questions

If you encounter issues during migration:

1. Check server logs for `[Idempotency]` messages
2. Verify `__idempotency` metadata in responses
3. Test with duplicate idempotency keys to confirm caching
4. Ensure `X-API-Key` header is present
5. Validate RPC request format matches examples above

For architecture questions or clarifications, refer to:
- [API Documentation](../api/README.md)
- [oRPC Handler Documentation](https://orpc.unnoq.com/docs/openapi/openapi-handler)
- SpectralNotify GitHub issues

## Conclusion

Using the `/rpc` endpoint with proper oRPC format is the **correct and recommended** way to integrate SpectralTranscript with SpectralNotify. This ensures full idempotency support, cached response detection, and production-grade reliability.

The REST endpoints remain available for debugging and non-critical use cases, but should not be used for production integration where idempotency is required.
