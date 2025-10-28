# Integration Guide: External Services with spectralNotify

This guide explains how to integrate external services (like NotifyBroker, monitoring systems, or custom applications) with spectralNotify's real-time task tracking system.

## 🚨 IMPORTANT: Which Endpoint to Use?

**For production integrations requiring idempotency:**
- ✅ Use `/rpc` endpoint with oRPC format
- ✅ Get `__idempotency` metadata in responses
- ✅ Full middleware support (idempotency, caching, etc.)
- 📖 **See [SpectralTranscript Integration Guide](./SPECTRAL_TRANSCRIPT_INTEGRATION.md) for details**

**For simple debugging/monitoring (NO idempotency):**
- ⚠️ Use `/tasks/*` REST endpoints (documented below)
- ⚠️ NO idempotency middleware
- ⚠️ NO `__idempotency` metadata
- 📖 Continue reading this document

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [Integration Patterns](#integration-patterns)
4. [Common Use Cases](#common-use-cases)
5. [Error Handling](#error-handling)
6. [Best Practices](#best-practices)
7. [Example: NotifyBroker Integration](#example-notifybroker-integration)

---

## Quick Start

### Step 1: Obtain API Key

Contact your spectralNotify administrator to obtain an API key. Store it securely as an environment variable:

```bash
# .env
SPECTRAL_NOTIFY_URL=https://your-instance.workers.dev
SPECTRAL_NOTIFY_API_KEY=your-secret-api-key-here
```

### Step 2: Verify Connectivity

Test the connection with a health check:

```typescript
const response = await fetch(`${SPECTRAL_NOTIFY_URL}/health`, {
  headers: {
    "X-API-Key": SPECTRAL_NOTIFY_API_KEY,
  },
});

const health = await response.json();
console.log(health); // { status: "healthy", ... }
```

### Step 3: Create Your First Task

```typescript
const response = await fetch(`${SPECTRAL_NOTIFY_URL}/tasks/create`, {
  method: "POST",
  headers: {
    "X-API-Key": SPECTRAL_NOTIFY_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    id: "TASK-TEST-001",
    status: "in-progress",
    progress: 0,
    metadata: {
      source: "my-integration",
      userId: "user-123",
    },
  }),
});

const result = await response.json();
console.log(result); // { success: true, taskId: "TASK-TEST-001" }
```

---

## Authentication

spectralNotify supports two authentication methods:

### API Key Authentication (Recommended for Services)

```typescript
headers: {
  "X-API-Key": "your-api-key",
  "Content-Type": "application/json"
}
```

### Session-Based Authentication (For Web UIs)

Use Better-Auth session cookies (automatically handled by the frontend SDK).

---

## Integration Patterns

### Pattern 1: Simple Notification Broker

For services that track long-running operations:

```typescript
class MyNotificationBroker {
  constructor(private apiKey: string, private baseUrl: string) {}

  async notifyOperationStarted(operationId: string, metadata: Record<string, unknown>) {
    return fetch(`${this.baseUrl}/tasks/create`, {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: this.formatTaskId(operationId),
        status: "in-progress",
        progress: 0,
        metadata,
      }),
    });
  }

  async notifyProgress(operationId: string, progress: number) {
    return fetch(`${this.baseUrl}/tasks/updateProgress`, {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskId: this.formatTaskId(operationId),
        progress,
      }),
    });
  }

  async notifyCompletion(operationId: string, metadata?: Record<string, unknown>) {
    return fetch(`${this.baseUrl}/tasks/complete`, {
      method: "POST",
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskId: this.formatTaskId(operationId),
        metadata,
      }),
    });
  }

  private formatTaskId(id: string): string {
    // Convert UUID to spectralNotify format
    return `TASK-${id.slice(0, 8).toUpperCase()}`;
  }
}
```

### Pattern 2: WebSocket Listener (Bidirectional)

For services that need to receive real-time updates:

```typescript
class TaskSubscriber {
  private ws: WebSocket | null = null;

  subscribe(taskId: string, onUpdate: (event: any) => void) {
    const wsUrl = `${this.baseUrl.replace("http", "ws")}/ws/task/${taskId}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      const update = JSON.parse(event.data);

      // Ignore ping/pong
      if (update.type === "ping" || update.type === "pong") {
        return;
      }

      // Handle task updates
      onUpdate(update);
    };

    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.ws.onclose = () => {
      console.log("WebSocket closed, attempting reconnect...");
      setTimeout(() => this.subscribe(taskId, onUpdate), 3000);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Usage
const subscriber = new TaskSubscriber();
subscriber.subscribe("TASK-123", (event) => {
  console.log(`Task update: ${event.type}`, event);

  if (event.type === "complete") {
    console.log("Task completed!");
    subscriber.disconnect();
  }
});
```

---

## Common Use Cases

### Use Case 1: File Download Tracking

```typescript
class DownloadTracker {
  async trackDownload(downloadId: string, url: string) {
    // Create task
    await fetch(`${SPECTRAL_NOTIFY_URL}/tasks/create`, {
      method: "POST",
      headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        id: `TASK-${downloadId}`,
        status: "in-progress",
        progress: 0,
        metadata: {
          type: "download",
          url,
          startedAt: new Date().toISOString(),
        },
      }),
    });

    // Simulate download with progress updates
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      await fetch(`${SPECTRAL_NOTIFY_URL}/tasks/updateProgress`, {
        method: "POST",
        headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: `TASK-${downloadId}`,
          progress,
        }),
      });
    }

    // Complete task
    await fetch(`${SPECTRAL_NOTIFY_URL}/tasks/complete`, {
      method: "POST",
      headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: `TASK-${downloadId}`,
        metadata: {
          completedAt: new Date().toISOString(),
          filePath: "/downloads/file.mp4",
        },
      }),
    });
  }
}
```

### Use Case 2: Batch Job Processing

```typescript
class BatchProcessor {
  async processBatch(jobs: Array<{ id: string; data: any }>) {
    // Create tasks for all jobs
    await Promise.all(
      jobs.map(job =>
        fetch(`${SPECTRAL_NOTIFY_URL}/tasks/create`, {
          method: "POST",
          headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            id: `TASK-${job.id}`,
            status: "pending",
            progress: 0,
            metadata: { jobData: job.data },
          }),
        })
      )
    );

    // Process each job
    for (const job of jobs) {
      try {
        await this.processJob(job);

        await fetch(`${SPECTRAL_NOTIFY_URL}/tasks/complete`, {
          method: "POST",
          headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: `TASK-${job.id}`,
            metadata: { result: "success" },
          }),
        });
      } catch (error) {
        await fetch(`${SPECTRAL_NOTIFY_URL}/tasks/fail`, {
          method: "POST",
          headers: { "X-API-Key": API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId: `TASK-${job.id}`,
            error: error.message,
          }),
        });
      }
    }
  }

  private async processJob(job: any) {
    // Your job processing logic
  }
}
```

---

## Error Handling

### Retry Logic with Exponential Backoff

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        return response;
      }

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status}`);
      }

      // Retry on 5xx errors (server errors)
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
    }
  }

  throw new Error("Max retries exceeded");
}
```

### Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private threshold = 5;
  private isOpen = false;
  private resetTimeout = 60000; // 1 minute

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      throw new Error("Circuit breaker is open");
    }

    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;

      if (this.failures >= this.threshold) {
        this.isOpen = true;
        setTimeout(() => {
          this.isOpen = false;
          this.failures = 0;
        }, this.resetTimeout);
      }

      throw error;
    }
  }
}

const breaker = new CircuitBreaker();

// Usage
await breaker.call(() =>
  fetch(`${SPECTRAL_NOTIFY_URL}/tasks/updateProgress`, { ... })
);
```

---

## Best Practices

### 1. ✅ Use Idempotency Keys (Coming in Phase 2)

```typescript
headers: {
  "X-API-Key": API_KEY,
  "Content-Type": "application/json",
  "Idempotency-Key": crypto.randomUUID(), // Prevents duplicates
}
```

### 2. ✅ Validate Before Sending

```typescript
function validateTaskId(id: string): boolean {
  return /^TASK-[A-F0-9]{8}$/.test(id);
}

function validateProgress(progress: number): boolean {
  return progress >= 0 && progress <= 100;
}
```

### 3. ✅ Handle Network Failures Gracefully

```typescript
try {
  await notifyProgress(taskId, progress);
} catch (error) {
  // Log but don't throw - progress updates are best-effort
  console.error(`Failed to notify progress for ${taskId}:`, error);
}
```

### 4. ✅ Use Batch Endpoints for High Frequency (Phase 3)

```typescript
// Instead of 100 individual calls
await Promise.all(
  tasks.map(task => notifyProgress(task.id, task.progress))
);

// Use batch API (coming soon)
await fetch(`${SPECTRAL_NOTIFY_URL}/tasks/batchUpdateProgress`, {
  body: JSON.stringify({
    updates: tasks.map(t => ({ taskId: t.id, progress: t.progress })),
  }),
});
```

### 5. ✅ Monitor Health Proactively

```typescript
setInterval(async () => {
  try {
    const response = await fetch(`${SPECTRAL_NOTIFY_URL}/health`);
    const health = await response.json();

    if (health.status !== "healthy") {
      console.warn("spectralNotify is degraded:", health);
      // Alert your monitoring system
    }
  } catch (error) {
    console.error("spectralNotify health check failed:", error);
  }
}, 60000); // Check every minute
```

---

## Example: NotifyBroker Integration

Complete implementation for a notification broker service:

```typescript
class NotifyBroker {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private circuitBreaker: CircuitBreaker;

  constructor(baseUrl: string, apiKey: string) {
    if (!baseUrl || !apiKey) {
      throw new Error("baseUrl and apiKey are required");
    }
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
    this.circuitBreaker = new CircuitBreaker();
  }

  // ✅ CORRECT: Single call for task creation
  async notifyDownloadStartedAsync(task: DownloadTask): Promise<void> {
    await this.circuitBreaker.call(() =>
      fetchWithRetry(`${this.baseUrl}/tasks/create`, {
        method: "POST",
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: this.formatTaskId(task.id),
          status: "in-progress",
          progress: 0,
          metadata: {
            url: task.url,
            format: task.format,
            userId: task.userId,
            startedAt: new Date().toISOString(),
          },
        }),
      })
    );
  }

  // ✅ CORRECT: Single call for progress update
  async notifyProgressUpdateAsync(taskId: string, progress: number): Promise<void> {
    // Best-effort: don't throw on failure
    try {
      await fetchWithRetry(`${this.baseUrl}/tasks/updateProgress`, {
        method: "POST",
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: this.formatTaskId(taskId),
          progress,
        }),
      });
    } catch (error) {
      console.error(`Failed to notify progress for ${taskId}:`, error);
    }
  }

  // ✅ CORRECT: Single call for completion
  async notifyDownloadCompletedAsync(task: DownloadTask): Promise<void> {
    await this.circuitBreaker.call(() =>
      fetchWithRetry(`${this.baseUrl}/tasks/complete`, {
        method: "POST",
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: this.formatTaskId(task.id),
          metadata: {
            filePath: task.filePath,
            completedAt: new Date().toISOString(),
          },
        }),
      })
    );
  }

  // ✅ CORRECT: Single call for failure
  async notifyDownloadFailedAsync(taskId: string, error: string): Promise<void> {
    await this.circuitBreaker.call(() =>
      fetchWithRetry(`${this.baseUrl}/tasks/fail`, {
        method: "POST",
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId: this.formatTaskId(taskId),
          error,
          metadata: {
            failedAt: new Date().toISOString(),
          },
        }),
      })
    );
  }

  private formatTaskId(uuid: string): string {
    // Convert UUID to spectralNotify format: TASK-550E8400
    return `TASK-${uuid.slice(0, 8).toUpperCase().replace(/-/g, "")}`;
  }
}

// Usage in YouTubeDownloadProcessor
class YouTubeDownloadProcessor {
  constructor(private notifyBroker: NotifyBroker) {}

  async startDownload(taskId: string, url: string) {
    const task = { id: taskId, url, userId: "user-123" };

    // Notify start
    await this.notifyBroker.notifyDownloadStartedAsync(task);

    // Download with progress updates
    for (let progress = 0; progress <= 100; progress += 10) {
      await this.downloadChunk();
      await this.notifyBroker.notifyProgressUpdateAsync(taskId, progress);
    }

    // Notify completion
    await this.notifyBroker.notifyDownloadCompletedAsync({
      ...task,
      filePath: "/downloads/video.mp4",
    });
  }
}
```

---

## Additional Resources

- **API Reference**: See `apps/server/docs/api/README.md`
- **OpenAPI Spec**: Available at `/api-reference` endpoint
- **Health Check**: `GET /health` for service status
- **WebSocket Protocol**: See Task Durable Object documentation

For questions or issues, contact support@spectralnotify.com
