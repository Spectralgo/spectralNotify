# Task Durable Object Implementation Guide

## Overview

This guide documents the Task Durable Object implementation, which provides persistent, real-time task management with WebSocket support for spectralNotify. Each task runs in its own Durable Object instance with SQLite storage, similar to the Counter implementation.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Web Client  │  │React Native  │  │   Any HTTP   │      │
│  │  (Browser)   │  │    Client    │  │    Client    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         │ WebSocket        │ WebSocket        │ HTTP         │
│         │ ws://host/ws/    │ ws://host/ws/    │ RPC Calls    │
│         │ task/:taskId     │ task/:taskId     │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────────┐
│                      Hono API Layer                           │
│  ┌─────────────────────────────────────────────────────┐     │
│  │          Task Router (oRPC)                         │     │
│  │  • create, getById, addEvent, updateProgress        │     │
│  │  • complete, fail, cancel, getHistory, delete       │     │
│  └────────────────────┬────────────────────────────────┘     │
│                       │                                       │
│                       │ Task Binding                          │
└───────────────────────┼───────────────────────────────────────┘
                        │
                        │
┌───────────────────────▼───────────────────────────────────────┐
│            Task Durable Object (Per Task Instance)            │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Drizzle ORM + SQLite Storage              │  │
│  │  ┌──────────────────┐   ┌──────────────────────────┐  │  │
│  │  │ taskMetadata     │   │ taskHistory              │  │  │
│  │  │  • id            │   │  • id                    │  │  │
│  │  │  • taskId        │   │  • eventType             │  │  │
│  │  │  • status        │   │  • message               │  │  │
│  │  │  • progress      │   │  • progress              │  │  │
│  │  │  • createdAt     │   │  • timestamp             │  │  │
│  │  │  • updatedAt     │   │  • metadata (JSON)       │  │  │
│  │  │  • completedAt   │   └──────────────────────────┘  │  │
│  │  │  • failedAt      │                                  │  │
│  │  │  • canceledAt    │                                  │  │
│  │  │  • metadata      │                                  │  │
│  │  └──────────────────┘                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         WebSocket Session Manager                      │  │
│  │  • Hibernation support                                 │  │
│  │  • Auto ping/pong                                      │  │
│  │  • Real-time broadcasts                                │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

### Registry Pattern

All tasks are tracked in a central D1 database table (`task_registry`) for listing and discovery:

```
┌─────────────────────────────────────────────────────────────┐
│                    D1 Database (Central)                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                  task_registry                         │ │
│  │  • id (auto-increment)                                 │ │
│  │  • taskId (unique)                                     │ │
│  │  • createdAt                                           │ │
│  │  • createdBy (userId)                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

1. **One Durable Object Per Task**: Each task has its own isolated DO instance
2. **Persistent SQLite Storage**: All task data persists across restarts
3. **WebSocket Real-Time Updates**: Clients receive live updates on all mutations
4. **Event History**: Full audit trail of all task events
5. **Transaction Support**: Atomic operations for data consistency
6. **Hibernation Support**: Efficient WebSocket connection management
7. **Type-Safe API**: Full TypeScript support with oRPC

## API Reference

### Task Router Endpoints

#### Create Task
```typescript
// Requires authentication
await client.tasks.create({
  taskId: "TASK-001",
  status: "pending",
  progress: 0,
  metadata: {
    description: "Process video",
    userId: "user-123"
  }
});
```

#### Get Task
```typescript
// Public endpoint
const task = await client.tasks.getById({
  taskId: "TASK-001"
});

// Response:
// {
//   id: 1,
//   taskId: "TASK-001",
//   status: "pending",
//   progress: 0,
//   createdAt: "2025-10-24T10:00:00Z",
//   updatedAt: "2025-10-24T10:00:00Z",
//   metadata: "{...}"
// }
```

#### Add Event
```typescript
// Public endpoint
await client.tasks.addEvent({
  taskId: "TASK-001",
  event: {
    eventType: "log",
    message: "Starting video processing",
    progress: 10,
    metadata: { step: "download" }
  }
});
```

#### Update Progress
```typescript
// Public endpoint
await client.tasks.updateProgress({
  taskId: "TASK-001",
  progress: 50
});
```

#### Complete Task
```typescript
// Public endpoint
await client.tasks.complete({
  taskId: "TASK-001",
  metadata: {
    outputUrl: "https://example.com/video.mp4",
    duration: 120
  }
});
```

#### Fail Task
```typescript
// Public endpoint
await client.tasks.fail({
  taskId: "TASK-001",
  error: "Video processing failed: Invalid format",
  metadata: { errorCode: "INVALID_FORMAT" }
});
```

#### Cancel Task
```typescript
// Public endpoint
await client.tasks.cancel({
  taskId: "TASK-001",
  metadata: { reason: "User requested cancellation" }
});
```

#### Get History
```typescript
// Public endpoint
const history = await client.tasks.getHistory({
  taskId: "TASK-001",
  limit: 50
});

// Returns array of events:
// [
//   {
//     id: 1,
//     eventType: "log",
//     message: "Task created",
//     timestamp: "2025-10-24T10:00:00Z"
//   },
//   ...
// ]
```

#### List All Tasks
```typescript
// Requires authentication
const { tasks, count } = await client.tasks.listAll();

// Response:
// {
//   tasks: [
//     { taskId: "TASK-001", createdAt: "...", createdBy: "user-123" }
//   ],
//   count: 1
// }
```

#### Delete Task
```typescript
// Requires authentication
await client.tasks.delete({
  taskId: "TASK-001"
});
```

## WebSocket Integration

### Browser (React/Vite)

```typescript
import { createTaskWebSocket } from '@/utils/websocket-task';
import type { TaskWebSocketMessage } from '@spectralNotify/api/types/task';

function TaskMonitor({ taskId }: { taskId: string }) {
  const [taskState, setTaskState] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = createTaskWebSocket(taskId, {
      onOpen: () => {
        console.log(`Connected to task ${taskId}`);
      },
      onMessage: (message: TaskWebSocketMessage) => {
        if (message.type === 'event') {
          console.log('New event:', message.event);
          setTaskState(message.task);
        } else if (message.type === 'progress') {
          console.log('Progress:', message.progress);
          setTaskState(message.task);
        } else if (message.type === 'complete') {
          console.log('Task completed!');
          setTaskState(message.task);
        } else if (message.type === 'fail') {
          console.error('Task failed:', message.error);
          setTaskState(message.task);
        }
      },
      onClose: () => {
        console.log('Disconnected');
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
      }
    });

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [taskId]);

  return (
    <div>
      <h2>Task: {taskId}</h2>
      {taskState && (
        <>
          <p>Status: {taskState.status}</p>
          <p>Progress: {taskState.progress}%</p>
        </>
      )}
    </div>
  );
}
```

### React Native (Expo)

```typescript
import { createTaskWebSocket } from '@/utils/websocket-task';
import type { TaskWebSocketMessage } from '@spectralNotify/api/types/task';

function TaskMonitor({ taskId }: { taskId: string }) {
  const [taskState, setTaskState] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = createTaskWebSocket(taskId, {
      onOpen: () => {
        console.log(`Connected to task ${taskId}`);
      },
      onMessage: (message: TaskWebSocketMessage) => {
        if (message.type === 'event') {
          console.log('New event:', message.event);
          setTaskState(message.task);
        } else if (message.type === 'progress') {
          console.log('Progress:', message.progress);
          setTaskState(message.task);
        } else if (message.type === 'complete') {
          console.log('Task completed!');
          setTaskState(message.task);
        }
      }
    });

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [taskId]);

  return (
    <View>
      <Text>Task: {taskId}</Text>
      {taskState && (
        <>
          <Text>Status: {taskState.status}</Text>
          <Text>Progress: {taskState.progress}%</Text>
        </>
      )}
    </View>
  );
}
```

## Migration Guide

### Generate Migrations

```bash
# Generate SQL migrations from schema
pnpm task:generate

# Create migrations.js manifest
pnpm task:migrate
```

### Migration Files

```
apps/server/src/task-migrations/
├── generated/
│   ├── 0000_public_old_lace.sql    # SQL migration
│   ├── migrations.js                # Manifest for runtime
│   └── meta/
│       ├── _journal.json
│       └── 0000_snapshot.json
└── README.md
```

### Local Development

```bash
# Run dev server (auto-applies migrations)
pnpm dev
```

### Deployment

```bash
# Deploy to Cloudflare (migrations run on DO initialization)
pnpm deploy
```

## Task Lifecycle

```
┌─────────┐
│ pending │ ──────┐
└─────────┘       │
                  │
                  ▼
           ┌──────────────┐
           │ in-progress  │
           └──────────────┘
                  │
         ┌────────┼────────┐
         │        │        │
         ▼        ▼        ▼
    ┌─────────┐ ┌──────┐ ┌──────────┐
    │ success │ │failed│ │ canceled │
    └─────────┘ └──────┘ └──────────┘
```

## Event Types

- **log**: General information event
- **progress**: Progress update event
- **error**: Error event (used for failures and cancellations)
- **success**: Completion event

## Best Practices

### 1. Task ID Naming
Use descriptive, unique task IDs:
```typescript
const taskId = `TASK-${Date.now()}-${userId}`;
```

### 2. Metadata Usage
Store relevant context in metadata:
```typescript
{
  metadata: {
    userId: "user-123",
    source: "mobile-app",
    priority: "high",
    estimatedDuration: 300
  }
}
```

### 3. Progress Updates
Update progress at meaningful milestones:
```typescript
// Good
await updateProgress(taskId, 0);   // Started
await updateProgress(taskId, 25);  // Downloaded
await updateProgress(taskId, 50);  // Processing
await updateProgress(taskId, 75);  // Uploading
await updateProgress(taskId, 100); // Complete

// Avoid excessive updates
// ❌ Updating every 1% (100 calls)
```

### 4. Error Handling
Provide descriptive error messages:
```typescript
await client.tasks.fail({
  taskId,
  error: "Video processing failed: Unsupported codec (H.265)",
  metadata: {
    errorCode: "UNSUPPORTED_CODEC",
    codec: "H.265",
    recommendation: "Use H.264 codec"
  }
});
```

### 5. WebSocket Reconnection
Implement reconnection logic:
```typescript
function useTaskWebSocket(taskId: string) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const socket = createTaskWebSocket(taskId, {
      onClose: () => {
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      }
    });
    setWs(socket);
  }, [taskId]);

  useEffect(() => {
    connect();
    return () => {
      ws?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return ws;
}
```

## Comparison with Counter Implementation

| Feature | Counter DO | Task DO |
|---------|-----------|---------|
| **Purpose** | Numeric counter | Task management |
| **Persistence** | SQLite | SQLite |
| **WebSocket** | ✅ | ✅ |
| **Hibernation** | ✅ | ✅ |
| **Registry** | ✅ counterRegistry | ✅ taskRegistry |
| **Mutations** | increment, decrement, setValue, reset | addEvent, updateProgress, complete, fail, cancel |
| **History** | CounterHistory | TaskHistory |
| **ID Type** | Name (string) | TaskId (string) |
| **Auth** | Required for create/delete | Required for create/delete/listAll |

## Troubleshooting

### Migration Issues

**Problem**: `migrations.js` not found

**Solution**:
```bash
pnpm task:migrate
```

### WebSocket Connection Failed

**Problem**: Cannot connect to `ws://localhost:8094/ws/task/:taskId`

**Solution**: Ensure dev server is running:
```bash
pnpm dev
```

### Task Not Found

**Problem**: `Task not initialized` error

**Solution**: Create the task first:
```typescript
await client.tasks.create({ taskId, status: "pending", ... });
```

### Registry Out of Sync

**Problem**: Task exists in DO but not in registry

**Solution**: Delete and recreate the task:
```typescript
await client.tasks.delete({ taskId });
await client.tasks.create({ taskId, ... });
```

## Performance Considerations

1. **DO Instances**: Each task gets its own DO instance - monitor costs
2. **WebSocket Limits**: Cloudflare limits concurrent WebSocket connections
3. **Event History**: Limit history queries with the `limit` parameter
4. **Cleanup**: Delete completed tasks to free DO resources

## Future Enhancements

- [ ] Task querying by status (filter support)
- [ ] Task scheduling (delayed start)
- [ ] Task dependencies (wait for other tasks)
- [ ] Task retries (automatic retry on failure)
- [ ] Task expiration (TTL support)
- [ ] Batch operations (bulk create/update)
- [ ] Task priority queues

## Resources

- [Counter DO Implementation](./websocket-counter-implementation.md)
- [Cloudflare Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [Drizzle ORM Docs](https://orm.drizzle.team/)
- [oRPC Docs](https://orpc.unnoq.com/)

---

**Last Updated**: 2025-10-24
**Version**: 1.0.0
