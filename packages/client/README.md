# @spectralnotify/client

Portable React client library for subscribing to SpectralNotify workflow and task updates with real-time WebSocket support.

## Features

- 🚀 **Simple React Hooks** - Easy-to-use `useWorkflow` and `useTask` hooks
- 📡 **Real-time WebSocket** - Live updates with connection state management
- 🔄 **TanStack Query** - Built on TanStack Query for optimal caching and state management
- 🎯 **Type-safe** - Full TypeScript support with comprehensive type definitions
- 📦 **Zero oRPC dependency** - Uses standard fetch API and WebSockets
- ⚡ **Lightweight** - Minimal bundle size with tree-shaking support

## Installation

```bash
npm install @spectralnotify/client @tanstack/react-query

# or
yarn add @spectralnotify/client @tanstack/react-query

# or
pnpm add @spectralnotify/client @tanstack/react-query
```

## Quick Start

### 1. Wrap your app with SpectralNotifyProvider

```tsx
import { SpectralNotifyProvider } from '@spectralnotify/client';

function App() {
  return (
    <SpectralNotifyProvider
      config={{
        serverUrl: 'https://your-spectralnotify-server.com'
      }}
    >
      <YourApp />
    </SpectralNotifyProvider>
  );
}
```

### 2. Use the hooks in your components

#### Workflow Example

```tsx
import { useWorkflow } from '@spectralnotify/client';

function WorkflowMonitor({ workflowId }) {
  const {
    workflow,
    isLoading,
    isConnected,
    isError,
    error
  } = useWorkflow({ workflowId });

  if (isLoading) return <div>Loading workflow...</div>;
  if (isError) return <div>Error: {error?.message}</div>;
  if (!workflow) return <div>Workflow not found</div>;

  return (
    <div>
      <h1>Workflow: {workflow.id}</h1>
      <div>
        <span>Status: {workflow.status}</span>
        <span> | Progress: {workflow.overallProgress}%</span>
        <span> | Live: {isConnected ? '🟢' : '🔴'}</span>
      </div>

      <h2>Phases</h2>
      {workflow.phases.map(phase => (
        <div key={phase.key}>
          {phase.label}: {phase.progress}% ({phase.status})
        </div>
      ))}

      <h2>Events</h2>
      {workflow.events.map(event => (
        <div key={event.id}>
          {event.timestamp.toLocaleString()} - {event.message}
        </div>
      ))}
    </div>
  );
}
```

#### Task Example

```tsx
import { useTask } from '@spectralnotify/client';

function TaskMonitor({ taskId }) {
  const {
    task,
    isLoading,
    isConnected,
    refetch
  } = useTask({ taskId });

  if (isLoading) return <div>Loading task...</div>;
  if (!task) return <div>Task not found</div>;

  return (
    <div>
      <h1>Task: {task.id}</h1>
      <div>
        <span>Status: {task.status}</span>
        <span> | Progress: {task.progress}%</span>
        <span> | Live: {isConnected ? '🟢' : '🔴'}</span>
      </div>

      <button onClick={() => refetch()}>Refresh</button>

      <h2>Events</h2>
      {task.events.map(event => (
        <div key={event.id}>
          {event.timestamp.toLocaleString()} - {event.message}
        </div>
      ))}
    </div>
  );
}
```

## API Reference

### SpectralNotifyProvider

Provider component that configures the client library.

```tsx
interface SpectralNotifyConfig {
  serverUrl: string;
  headers?: HeadersInit;
  credentials?: RequestCredentials;
  queryClient?: QueryClient;
}

<SpectralNotifyProvider config={config}>
  {children}
</SpectralNotifyProvider>
```

#### Props

- `config.serverUrl` (**required**): The base URL of your SpectralNotify server
- `config.headers` (optional): Custom headers for API requests (e.g., API key)
- `config.credentials` (optional): Fetch credentials mode (default: `"include"`)
- `config.queryClient` (optional): Custom TanStack Query client

### useWorkflow

Hook for subscribing to workflow updates.

```tsx
function useWorkflow(options: UseWorkflowOptions): {
  // Data
  workflow?: Workflow;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // WebSocket state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  lastUpdate: Date | null;

  // Controls
  refetch: () => void;
  reconnect: () => void;
  disconnect: () => void;
}
```

#### Options

```tsx
interface UseWorkflowOptions {
  workflowId?: string;
  enableWebSocket?: boolean;
  onWebSocketUpdate?: (event: WorkflowUpdateEvent) => void;
}
```

- `workflowId` (optional): The workflow ID to subscribe to
- `enableWebSocket` (optional): Enable real-time updates (default: `true`)
- `onWebSocketUpdate` (optional): Callback for WebSocket updates

### useTask

Hook for subscribing to task updates.

```tsx
function useTask(options: UseTaskOptions): {
  // Data
  task?: Task;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // WebSocket state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
  lastUpdate: Date | null;

  // Controls
  refetch: () => void;
  reconnect: () => void;
  disconnect: () => void;
}
```

#### Options

```tsx
interface UseTaskOptions {
  taskId?: string;
  enableWebSocket?: boolean;
  onWebSocketUpdate?: (event: TaskUpdateEvent) => void;
}
```

- `taskId` (optional): The task ID to subscribe to
- `enableWebSocket` (optional): Enable real-time updates (default: `true`)
- `onWebSocketUpdate` (optional): Callback for WebSocket updates

## Type Definitions

### Workflow Types

```tsx
interface Workflow {
  id: string;
  status: WorkflowStatus;
  overallProgress: number;
  expectedPhaseCount?: number;
  completedPhaseCount?: number;
  activePhaseKey?: string | null;
  phases: WorkflowPhase[];
  events: WorkflowEvent[];
  lastUpdate?: string;
  metadata?: string;
}

interface WorkflowPhase {
  key: string;
  label: string;
  weight: number;
  status: "pending" | "in-progress" | "success" | "failed" | "canceled";
  progress: number;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
}

interface WorkflowEvent {
  id: string;
  timestamp: Date;
  type: WorkflowEventType;
  phaseKey?: string;
  message: string;
  progress?: number;
  metadata?: Record<string, unknown>;
}

type WorkflowStatus =
  | "pending"
  | "in-progress"
  | "success"
  | "failed"
  | "canceled";
```

### Task Types

```tsx
interface Task {
  id: string;
  status: TaskStatus;
  progress?: number;
  events: TaskEvent[];
  lastUpdate?: string;
  metadata?: string;
}

interface TaskEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  message: string;
  progress?: number;
  metadata?: Record<string, unknown>;
}

type TaskStatus =
  | "pending"
  | "in-progress"
  | "success"
  | "failed"
  | "canceled";
```

### WebSocket Types

```tsx
type ConnectionState =
  | "disconnected"  // Not connected, not trying to connect
  | "connecting"    // Initial connection attempt
  | "connected";    // Successfully connected
```

## Advanced Usage

### Custom Headers (API Key Authentication)

```tsx
<SpectralNotifyProvider
  config={{
    serverUrl: 'https://api.example.com',
    headers: {
      'X-API-Key': 'your-api-key-here'
    }
  }}
>
  <App />
</SpectralNotifyProvider>
```

### Custom Query Client

```tsx
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 3,
    },
  },
});

<SpectralNotifyProvider
  config={{
    serverUrl: 'https://api.example.com',
    queryClient
  }}
>
  <App />
</SpectralNotifyProvider>
```

### Disable WebSocket (Polling Only)

```tsx
const { workflow } = useWorkflow({
  workflowId: 'my-workflow',
  enableWebSocket: false
});
```

### WebSocket Event Callbacks

```tsx
const { workflow } = useWorkflow({
  workflowId: 'my-workflow',
  onWebSocketUpdate: (event) => {
    console.log('Received update:', event);

    if (event.type === 'complete') {
      showNotification('Workflow completed!');
    }
  }
});
```

### Manual Connection Control

```tsx
const {
  workflow,
  isConnected,
  reconnect,
  disconnect
} = useWorkflow({ workflowId: 'my-workflow' });

// Manually disconnect
const handlePause = () => {
  disconnect();
};

// Manually reconnect
const handleResume = () => {
  reconnect();
};
```

### Low-Level WebSocket API

For advanced use cases, you can use the WebSocket connection classes directly:

```tsx
import {
  createWorkflowWebSocket,
  createTaskWebSocket
} from '@spectralnotify/client';

// Workflow WebSocket
const workflowWs = createWorkflowWebSocket(
  'https://api.example.com',
  'workflow-id',
  {
    onStateChange: (state) => console.log('State:', state),
    onMessage: (message) => console.log('Update:', message),
    onOpen: () => console.log('Connected!'),
    onClose: () => console.log('Disconnected'),
    onError: (error) => console.error('Error:', error),
  }
);

// Task WebSocket
const taskWs = createTaskWebSocket(
  'https://api.example.com',
  'task-id',
  {
    onStateChange: (state) => console.log('State:', state),
    onMessage: (message) => console.log('Update:', message),
  }
);

// Check connection state
console.log('Connected:', workflowWs.isConnected());
console.log('State:', workflowWs.getState());

// Clean up
workflowWs.close();
taskWs.close();
```

## Error Handling

```tsx
const { workflow, isError, error, refetch } = useWorkflow({
  workflowId: 'my-workflow'
});

if (isError) {
  return (
    <div>
      <p>Error loading workflow: {error?.message}</p>
      <button onClick={() => refetch()}>Retry</button>
    </div>
  );
}
```

## Best Practices

### 1. Conditional Hook Usage

```tsx
function WorkflowView({ workflowId }) {
  // Hook will automatically enable/disable based on workflowId presence
  const { workflow, isLoading } = useWorkflow({ workflowId });

  if (!workflowId) {
    return <div>No workflow selected</div>;
  }

  // ...
}
```

### 2. Memoize Callbacks

```tsx
import { useCallback } from 'react';

function WorkflowView({ workflowId, onComplete }) {
  const handleUpdate = useCallback((event) => {
    if (event.type === 'complete') {
      onComplete?.(event.workflowId);
    }
  }, [onComplete]);

  const { workflow } = useWorkflow({
    workflowId,
    onWebSocketUpdate: handleUpdate
  });

  // ...
}
```

### 3. Clean Up on Unmount

The hooks automatically clean up WebSocket connections when unmounted, so no manual cleanup is required.

### 4. Connection State Monitoring

You can monitor WebSocket connection state in your UI:

```tsx
const { workflow, isConnected, isConnecting } = useWorkflow({
  workflowId: 'my-workflow'
});

return (
  <div>
    {isConnecting && <span>Connecting...</span>}
    {!isConnected && !isConnecting && <span>Offline</span>}
    {isConnected && <span>Live</span>}
  </div>
);
```

## External App Integration

SpectralNotify is designed to work with any external application. Here's how different clients can connect:

### Browser-based Apps

WebSocket connections from any origin are allowed. No special configuration needed:

```javascript
// Any browser app can connect to WebSocket
const ws = new WebSocket('wss://your-spectralnotify-server.com/ws/workflow/workflow-id');

ws.onopen = () => console.log('Connected!');
ws.onmessage = (event) => console.log('Update:', JSON.parse(event.data));
```

### Node.js / Server-side Apps

```javascript
import WebSocket from 'ws';

const ws = new WebSocket('wss://your-spectralnotify-server.com/ws/workflow/workflow-id');

ws.on('open', () => console.log('Connected!'));
ws.on('message', (data) => console.log('Update:', JSON.parse(data.toString())));
```

### REST API with API Key

For creating workflows/tasks and sending updates, use the REST API with an API key:

```javascript
// Create a workflow
const response = await fetch('https://your-spectralnotify-server.com/workflows/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key',
    'Idempotency-Key': crypto.randomUUID(),
  },
  body: JSON.stringify({
    workflowId: 'my-workflow',
    phases: [
      { key: 'phase-1', label: 'Processing', weight: 50 },
      { key: 'phase-2', label: 'Finalizing', weight: 50 },
    ],
  }),
});

// Subscribe to updates via WebSocket (no auth required)
const ws = new WebSocket('wss://your-spectralnotify-server.com/ws/workflow/my-workflow');
```

### Mobile Apps (React Native / Expo)

Use the `@spectralnotify/react-native` package or connect directly:

```javascript
// Direct WebSocket connection
const ws = new WebSocket('wss://your-spectralnotify-server.com/ws/workflow/workflow-id');
```

### CORS Configuration

- **WebSocket routes (`/ws/*`)**: Allow any origin - no restrictions
- **REST API routes**: Require `X-API-Key` header for authentication, allow any origin

## Testing

### Run Manual Test

Test the complete workflow lifecycle with colored console output:

```bash
# From project root (make sure server is running with pnpm dev)
pnpm --filter @spectralnotify/client test:manual

# With custom server URL
SERVER_URL=http://localhost:8094 pnpm --filter @spectralnotify/client test:manual
```

This will:
- ✅ Create a workflow via REST API (`/workflows/create`)
- ✅ Connect to WebSocket for real-time updates (`/ws/workflow/{id}`)
- ✅ Execute 3 phases with progress updates
- ✅ Verify all WebSocket events are received
- ✅ Show complete workflow lifecycle with timestamps

### Run Integration Tests

```bash
# Run all tests
pnpm --filter @spectralnotify/client test

# Run only integration tests
pnpm --filter @spectralnotify/client test:integration
```

See [test/README.md](./test/README.md) for detailed testing documentation.

## License

MIT

## Support

For issues or questions, please open an issue on the SpectralNotify repository.
