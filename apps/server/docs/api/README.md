# spectralNotify API Documentation

## API Access Methods

SpectralNotify provides two ways to access the API:

### 1. OpenAPI REST Endpoints (Recommended for External Integrations)

Standard REST API following OpenAPI 3.1 specification. **All external services should use these paths**:

```bash
POST /tasks/create
POST /tasks/updateProgress
POST /tasks/complete
POST /tasks/fail
POST /tasks/cancel
POST /tasks/addEvent
```

**Use this for**:
- ✅ External integrations (like NotifyBroker)
- ✅ Non-TypeScript clients (Python, Go, Rust, etc.)
- ✅ Standard HTTP clients (curl, Postman, etc.)
- ✅ Generated clients from OpenAPI specification

### 2. oRPC TypeScript Client (For Internal Use Only)

Type-safe client for internal TypeScript/JavaScript applications:

```typescript
// Internal web app uses this:
import { createORPCClient } from "@orpc/client";

const client = createORPCClient<AppRouter>({
  baseURL: "http://localhost:8094/rpc"  // Note: /rpc prefix for oRPC client
});

// Type-safe method calls:
await client.tasks.create({ id: "task-1", status: "pending", metadata: {} });
```

**Use this for**:
- ✅ Internal TypeScript applications
- ✅ Type-safe auto-completion
- ✅ Compile-time type checking

**⚠️ Important**: The `/rpc` prefix is ONLY for the oRPC TypeScript client. External REST integrations must use the OpenAPI endpoints without the `/rpc` prefix (e.g., `/tasks/create` not `/rpc/tasks.create`).

---

## Task Lifecycle & Automatic Event Creation

spectralNotify automatically creates internal events for all task operations. **Clients should NOT call `addEvent` after these operations** as it creates duplicate entries.

### Automatic Events

Every task lifecycle operation automatically creates events and broadcasts updates via WebSocket. This means external services (like NotifyBroker) should only call the lifecycle endpoints, not make additional `addEvent` calls.

| Operation | Endpoint | Auto-Generated Event | Broadcast Type | Notes |
|-----------|----------|---------------------|----------------|-------|
| Create Task | `POST /tasks/create` | `"Task created"` (type: "log") | - | Always created during initialization |
| Add Event | `POST /tasks/addEvent` | Custom event | `"event"` | Use for application-specific events only |
| Update Progress | `POST /tasks/updateProgress` | Progress milestone event | `"progress"` | Auto-created at 0%, 25%, 50%, 75%, 100% |
| Complete Task | `POST /tasks/complete` | `"Task completed successfully"` | `"complete"` | Includes completion timestamp |
| Fail Task | `POST /tasks/fail` | `"Task failed: {error}"` (type: "error") | `"fail"` | Includes error details |
| Cancel Task | `POST /tasks/cancel` | `"Task cancelled"` (type: "error") | `"cancel"` | Includes cancellation reason |

### WebSocket Broadcasting

All operations automatically broadcast updates to connected WebSocket clients at `/ws/task/:taskId`:

```typescript
// Event broadcast format
{
  type: "event" | "progress" | "complete" | "fail" | "cancel",
  taskId: string,
  task: TaskMetadata,  // Full task metadata
  timestamp: string,   // ISO 8601 timestamp
  event?: {            // Optional event details
    eventType: string,
    message: string,
    progress?: number,
    timestamp: string
  },
  progress?: number,   // For progress updates
  error?: string       // For failure events
}
```

### Best Practices for External Services

#### ✅ DO: Call lifecycle endpoints only

```typescript
// Example: NotifyBroker correct usage
class NotifyBroker {
  // ✅ CORRECT: Single call for download started
  async notifyDownloadStartedAsync(task: DownloadTask) {
    await fetch("/tasks/create", {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: formatTaskId(task.id),
        status: "in-progress",
        progress: 0,
        metadata: {
          url: task.url,
          format: task.format,
          createdBy: task.userId,
        },
      }),
    });
    // Event "Task created" is automatically added internally
    // ❌ DO NOT call addEvent here!
  }

  // ✅ CORRECT: Single call for progress update
  async notifyProgressUpdateAsync(taskId: string, progress: number) {
    await fetch("/tasks/updateProgress", {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskId: formatTaskId(taskId),
        progress,
      }),
    });
    // Progress event is automatically created at milestones
    // ❌ DO NOT call addEvent here!
  }
}
```

#### ❌ DON'T: Call addEvent after lifecycle operations

```typescript
// ❌ WRONG: Creates duplicate events!
async notifyDownloadStartedAsync(task: DownloadTask) {
  // First call - creates task and initial event
  await fetch("/tasks/create", { ... });

  // ❌ DUPLICATE! The create call already added this event
  await fetch("/tasks/addEvent", {
    body: JSON.stringify({
      taskId: task.id,
      event: {
        type: "log",
        message: "Task created",
      },
    }),
  });
}
```

#### ✅ DO: Use addEvent for custom application events

```typescript
// ✅ CORRECT: Custom events that aren't part of lifecycle
async notifyCustomEvent(taskId: string, eventType: string, message: string) {
  await fetch("/tasks/addEvent", {
    method: "POST",
    headers: {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      taskId,
      event: {
        type: eventType,
        message,
        metadata: { source: "custom-integration" },
      },
    }),
  });
}
```

## Idempotency Support

All mutation endpoints **require** idempotency keys to prevent duplicate operations. This ensures reliability for retry logic and network failure scenarios.

### How It Works

1. **Required**: Include `Idempotency-Key` header with a unique value (e.g., SHA-256 hash of operation)
2. Same key within 24 hours returns the cached response instantly (<5ms)
3. Keys automatically expire after 24 hours
4. Missing idempotency key returns `400 BAD_REQUEST` error

### Response Metadata

All mutation responses include `__idempotency` metadata:

**Fresh Response** (first request):
```json
{
  "success": true,
  "taskId": "task-123",
  "__idempotency": {
    "cached": false,
    "key": "a3f8b2c1"
  }
}
```

**Cached Response** (duplicate request):
```json
{
  "success": true,
  "taskId": "task-123",
  "__idempotency": {
    "cached": true,
    "cachedAt": "2025-10-28T12:34:56.789Z",
    "key": "a3f8b2c1"
  }
}
```

### Recommended Key Generation

Use deterministic keys based on operation signature:

```typescript
// Generate SHA-256 hash of operation
import crypto from "node:crypto";

function generateIdempotencyKey(endpoint: string, body: object): string {
  const signature = JSON.stringify({ endpoint, body });
  return crypto.createHash("sha256").update(signature).digest("hex");
}

// Example usage
const key = generateIdempotencyKey("/tasks/create", {
  id: "task-123",
  status: "pending"
});

await fetch("/tasks/create", {
  headers: {
    "Idempotency-Key": key,
    "X-API-Key": apiKey
  },
  body: JSON.stringify({ id: "task-123", status: "pending" })
});
```

### Benefits

- ✅ **Retry Safety**: Network failures can retry with same key, get cached response
- ✅ **Duplicate Prevention**: Same operation generates same key, prevents duplicates
- ✅ **Fast Retries**: Cached responses return in <5ms instead of full processing
- ✅ **No Storage Needed**: Keys are deterministic, no client-side storage required
- ✅ **Production Ready**: Required keys enforce best practices from day one

### Debug Mode

Add `X-Idempotency-Debug: true` header for verbose logging (development only):

```bash
curl -X POST /tasks/create \
  -H "Idempotency-Key: test-key-123" \
  -H "X-Idempotency-Debug: true" \
  -H "X-API-Key: $API_KEY" \
  -d '{"id":"task-1","status":"pending","metadata":{}}'
```

Logs will include full idempotency key and cache hit/miss information.

---

### API Endpoints Reference

#### Create Task
```
POST /tasks/create
Authorization: X-API-Key or session
Content-Type: application/json

Request:
{
  "id": "TASK-550E8400",           // Required: Unique task ID
  "status": "in-progress",         // Required: pending|in-progress|success|failed|canceled
  "progress": 0,                   // Optional: 0-100
  "metadata": {                    // Required: Task metadata
    "url": "https://...",
    "format": "audio",
    "createdBy": "user-123"
  }
}

Response:
{
  "success": true,
  "taskId": "TASK-550E8400"
}

Automatic Event Created:
- Type: "log"
- Message: "Task created"
- Timestamp: Current ISO timestamp
```

#### Update Progress
```
POST /tasks/updateProgress
Authorization: X-API-Key or session
Content-Type: application/json

Request:
{
  "taskId": "TASK-550E8400",       // Required
  "progress": 50                   // Required: 0-100
}

Response:
{
  "task": { ... },                 // Updated task metadata
  "latestHistory": [ ... ]         // Recent 10 events
}

Automatic Event Created (at milestones):
- Type: "progress"
- Message: "Download progress: 50%"
- Progress: 50
- Created at: 0%, 25%, 50%, 75%, 100%
```

#### Complete Task
```
POST /tasks/complete
Authorization: X-API-Key or session
Content-Type: application/json

Request:
{
  "taskId": "TASK-550E8400",       // Required
  "metadata": {                    // Optional: Additional metadata
    "filePath": "/path/to/file",
    "completedAt": "2025-10-28T..."
  }
}

Response:
{
  "task": { ... },                 // Updated task metadata
  "latestHistory": [ ... ]         // Recent 10 events
}

Automatic Event Created:
- Type: "success"
- Message: "Task completed successfully"
- Progress: 100
```

#### Fail Task
```
POST /tasks/fail
Authorization: X-API-Key or session
Content-Type: application/json

Request:
{
  "taskId": "TASK-550E8400",       // Required
  "error": "Network timeout",      // Required: Error message
  "metadata": {                    // Optional: Additional metadata
    "failedAt": "2025-10-28T..."
  }
}

Response:
{
  "task": { ... },                 // Updated task metadata
  "latestHistory": [ ... ]         // Recent 10 events
}

Automatic Event Created:
- Type: "error"
- Message: "Task failed: Network timeout"
- Metadata: { error: "Network timeout" }
```

#### Cancel Task
```
POST /tasks/cancel
Authorization: X-API-Key or session
Content-Type: application/json

Request:
{
  "taskId": "TASK-550E8400",       // Required
  "metadata": {                    // Optional: Additional metadata
    "cancelledAt": "2025-10-28T...",
    "reason": "User requested cancellation"
  }
}

Response:
{
  "task": { ... },                 // Updated task metadata
  "latestHistory": [ ... ]         // Recent 10 events
}

Automatic Event Created:
- Type: "error"
- Message: "Task cancelled by user"
- Metadata: { cancelled: true }
```

#### Add Custom Event (Advanced)
```
POST /tasks/addEvent
Authorization: X-API-Key or session
Content-Type: application/json

Request:
{
  "taskId": "TASK-550E8400",       // Required
  "event": {
    "type": "log",                 // Required: log|progress|error|success
    "message": "Custom event",     // Required
    "progress": 25,                // Optional: 0-100
    "metadata": {                  // Optional: Custom data
      "source": "integration"
    }
  }
}

Response:
{
  "task": { ... },                 // Updated task metadata
  "latestHistory": [ ... ]         // Recent 10 events
}

Note: Only use for custom events that aren't part of the standard lifecycle
```

### Performance Considerations

#### Two-Call Anti-Pattern (AVOID)
```typescript
// ❌ BAD: 350ms latency, 2x API key validations, 2x failure points
await fetch("/tasks/create", { ... });    // 200ms
await fetch("/tasks/addEvent", { ... });  // 150ms
// Total: 350ms, 2 API calls

// ✅ GOOD: 200ms latency, single operation
await fetch("/tasks/create", { ... });    // 200ms
// Total: 200ms, 1 API call (42% faster!)
```

#### Batch Operations (Recommended)
For high-frequency operations (coming in Phase 3), use batch endpoints:

```typescript
// Future: Batch API (reduces 100 calls to 10 calls)
await fetch("/tasks/batchUpdateProgress", {
  body: JSON.stringify({
    updates: [
      { taskId: "TASK-1", progress: 25 },
      { taskId: "TASK-2", progress: 50 },
      // ... up to 50 updates
    ],
  }),
});
```

### Error Handling

All endpoints return HTTP status codes:

- `200 OK`: Operation successful
- `400 Bad Request`: Invalid input (check Zod validation errors)
- `401 Unauthorized`: Missing or invalid API key
- `404 Not Found`: Task does not exist
- `500 Internal Server Error`: Server-side error

### Rate Limiting

Current limits (per API key):
- Standard endpoints: 100 requests/minute
- Batch endpoints: 10 requests/minute
- WebSocket connections: 50 concurrent connections

### Monitoring & Observability

All operations are logged to Cloudflare Workers Analytics:
- Request latency (p50, p95, p99)
- Error rates by endpoint
- WebSocket connection metrics
- Task creation/completion rates

Use the health check endpoint to monitor service availability:
```
GET /health
Response: { status: "healthy", services: { ... } }
```

### Support & Feedback

For issues or questions:
- GitHub Issues: https://github.com/spectralgo/spectralNotify/issues
- Documentation: https://docs.spectralnotify.com
- Integration Examples: See `apps/server/docs/integration/`
