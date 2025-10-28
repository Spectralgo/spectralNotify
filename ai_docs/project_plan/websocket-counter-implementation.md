# WebSocket Counter Implementation

## Overview

This document describes the implementation of real-time WebSocket connections to Counter Durable Objects using Cloudflare WebSocket Hibernation API, Hono, and native WebSocket connections.

## Architecture

### Server-Side Components

#### 1. Counter Durable Object (`apps/server/src/counter.ts`)

The Counter Durable Object has been enhanced with WebSocket Hibernation support:

**Key Features:**
- **Session Management**: Tracks active WebSocket connections using a `Map<WebSocket, SessionData>`
- **WebSocket Hibernation**: Supports Cloudflare's hibernation API for efficient memory usage
- **Auto-Response**: Configured ping/pong without waking hibernated connections
- **Session Persistence**: Restores sessions when the DO wakes from hibernation
- **Broadcasting**: All counter operations broadcast updates to connected clients

**WebSocket Handlers:**
- `fetch(request)` - Handles WebSocket upgrade requests
- `webSocketMessage(ws, message)` - Processes incoming messages (ping/pong, future client requests)
- `webSocketClose(ws, code, reason, wasClean)` - Cleans up closed connections
- `broadcastUpdate(event)` - Sends counter updates to all connected clients

**Broadcasting Integration:**
Counter operations automatically broadcast events:
- `increment()` - Broadcasts increment event
- `decrement()` - Broadcasts decrement event
- `setValue()` - Broadcasts setValue event
- `reset()` - Broadcasts reset event (via setValue)

#### 2. Hono WebSocket Route (`apps/server/src/index.ts`)

**Endpoint:** `GET /ws/counter/:name`

This route proxies WebSocket connections directly to the appropriate Counter Durable Object:

```typescript
app.get("/ws/counter/:name", async (c) => {
  const counterName = c.req.param("name");
  const counterId = c.env.COUNTER.idFromName(counterName);
  const counterStub = c.env.COUNTER.get(counterId);
  return counterStub.fetch(c.req.raw);
});
```

**How it works:**
1. Client requests WebSocket upgrade to `/ws/counter/{counterName}`
2. Hono validates it's a WebSocket upgrade request
3. Routes request to Counter DO based on name (using `idFromName`)
4. Counter DO handles the WebSocket upgrade and manages the connection

### Client-Side Components

#### 1. WebSocket Types (`packages/api/src/types/counter.ts` & `apps/web/src/types/counter.ts`)

**Type Definitions:**
```typescript
export type CounterUpdateEvent = {
  type: "increment" | "decrement" | "setValue" | "reset";
  value: number;
  previousValue: number;
  metadata: CounterMetadata;
  timestamp: string;
};

export type CounterWebSocketMessage =
  | CounterUpdateEvent
  | { type: "ping" }
  | { type: "pong"; timestamp: string }
  | { type: "error"; message: string };

export type WebSocketSessionData = {
  id: string;
  subscribedAt: string;
};
```

#### 2. WebSocket Utility (`apps/web/src/utils/websocket.ts`)

**Functions:**
- `createCounterWebSocket(counterName, options)` - Creates a WebSocket connection
- `sendPing(ws)` - Sends keep-alive ping
- `closeWebSocket(ws)` - Gracefully closes connection

**Features:**
- Automatic protocol detection (ws:// or wss://)
- Server URL configuration via environment variable
- Event handlers for open, message, close, error
- JSON message parsing

#### 3. React Hook (`apps/web/src/hooks/use-counter-websocket.ts`)

**Hook:** `useCounterWebSocket(counterName, options)`

**Features:**
- Automatic connection management (connect/disconnect/reconnect)
- TanStack Query cache integration
- Ping/pong keep-alive mechanism
- Connection state tracking (isConnected, isConnecting, error, lastUpdate)
- Automatic cache updates on counter events

**Options:**
```typescript
interface UseCounterWebSocketOptions {
  enabled?: boolean;
  onUpdate?: (event: CounterUpdateEvent) => void;
  reconnectInterval?: number; // Default: 3000ms
  pingInterval?: number;      // Default: 30000ms
}
```

**Return Value:**
```typescript
{
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  lastUpdate: Date | null;
  reconnect: () => void;
  disconnect: () => void;
}
```

## Data Flow

### 1. Connection Establishment

```
Client Component
  └─> useCounterWebSocket("my-counter")
       └─> createCounterWebSocket()
            └─> WebSocket: ws://server/ws/counter/my-counter
                 └─> Hono Route Handler
                      └─> Counter.idFromName("my-counter")
                           └─> Counter Durable Object
                                └─> fetch() handles upgrade
                                     └─> acceptWebSocket()
                                          └─> Session created & serialized
```

### 2. Counter Update Broadcast

```
Client A: Calls counter.increment({ name: "my-counter", amount: 1 })
  └─> HTTP RPC Request to /rpc/counter.increment
       └─> Counter Durable Object
            ├─> increment() method
            │    ├─> Update database
            │    └─> broadcastUpdate(event)
            │         └─> Sends JSON to all WebSocket clients
            │
            └─> Returns enriched response to Client A

Client B, C, D (connected via WebSocket)
  └─> Receive broadcast event
       └─> useCounterWebSocket hook
            └─> updateQueryCache()
                 ├─> Update getValue query
                 ├─> Update getMetadata query
                 └─> Invalidate getHistory query
```

### 3. Message Flow

**Client → Server (Ping):**
```json
{ "type": "ping" }
```

**Server → Client (Pong):**
```json
{
  "type": "pong",
  "timestamp": "2025-01-15T12:00:00.000Z"
}
```

**Server → Client (Update):**
```json
{
  "type": "increment",
  "value": 42,
  "previousValue": 41,
  "metadata": {
    "id": 1,
    "name": "my-counter",
    "value": 42,
    "createdAt": "2025-01-15T12:00:00.000Z",
    "updatedAt": "2025-01-15T12:00:01.000Z",
    "operationCount": 10
  },
  "timestamp": "2025-01-15T12:00:01.000Z"
}
```

## Usage Examples

### Basic Usage

```tsx
import { useCounterWebSocket } from "@/hooks/use-counter-websocket";

function CounterComponent({ counterName }: { counterName: string }) {
  const { isConnected, lastUpdate } = useCounterWebSocket(counterName);

  return (
    <div>
      <p>Status: {isConnected ? "Connected" : "Disconnected"}</p>
      {lastUpdate && <p>Last update: {lastUpdate.toLocaleTimeString()}</p>}
    </div>
  );
}
```

### With Custom Handler

```tsx
import { useCounterWebSocket } from "@/hooks/use-counter-websocket";
import { toast } from "sonner";

function CounterComponent({ counterName }: { counterName: string }) {
  const { isConnected } = useCounterWebSocket(counterName, {
    onUpdate: (event) => {
      toast.success(
        `Counter ${event.type}: ${event.previousValue} → ${event.value}`
      );
    },
  });

  return <div>Connected: {isConnected ? "Yes" : "No"}</div>;
}
```

### Conditional Connection

```tsx
import { useCounterWebSocket } from "@/hooks/use-counter-websocket";

function CounterComponent({ counterName, enableLive }: Props) {
  const { isConnected, reconnect, disconnect } = useCounterWebSocket(
    counterName,
    {
      enabled: enableLive,
    }
  );

  return (
    <div>
      <button onClick={enableLive ? disconnect : reconnect}>
        {enableLive ? "Disconnect" : "Connect"}
      </button>
    </div>
  );
}
```

## Benefits

### 1. Real-Time Updates
- All connected clients receive instant updates when any client modifies the counter
- No polling required - truly event-driven

### 2. Efficient Resource Usage
- **WebSocket Hibernation**: Durable Objects can be evicted from memory when inactive
- **Auto Ping/Pong**: Keep-alive without waking hibernated objects
- **Single Connection**: One WebSocket per counter, shared across all operations

### 3. Type Safety
- Full TypeScript types for all WebSocket messages
- Compile-time validation of event structures
- Auto-completion in IDE

### 4. Developer Experience
- Simple React hook API
- Automatic cache synchronization with TanStack Query
- Built-in reconnection logic
- Connection state tracking

### 5. Scalability
- Each counter name maps to a unique Durable Object
- Durable Objects automatically handle distribution and consistency
- WebSocket Hibernation reduces memory footprint

## Technical Considerations

### WebSocket URL Construction

The client constructs WebSocket URLs based on the server URL:

```typescript
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const serverUrl = import.meta.env.VITE_SERVER_URL; // e.g., "http://localhost:8094"
const serverHost = serverUrl.replace(/^https?:\/\//, ""); // "localhost:8094"
const wsUrl = `${protocol}//${serverHost}/ws/counter/${counterName}`;
```

### Reconnection Strategy

- Automatic reconnection after disconnect
- Configurable reconnection interval (default: 3000ms)
- Cleanup of previous connection before reconnecting
- Maintains reconnection attempts even if temporarily unavailable

### Cache Synchronization

The hook automatically updates three query types:
1. **getValue** - Direct value update
2. **getMetadata** - Full metadata update
3. **getHistory** - Invalidated to trigger refetch (ensures latest history)

This ensures the UI remains consistent with server state without additional API calls.

### Memory Management

- WebSocket reference stored in `useRef` to prevent re-creation
- Proper cleanup in `useEffect` return function
- Interval and timeout references properly cleared
- Connections closed gracefully on unmount

## Future Enhancements

### 1. Client-Initiated Operations via WebSocket
Currently, counter operations use HTTP RPC. Future enhancement could allow operations through WebSocket:

```typescript
// In webSocketMessage handler
if (parsed.type === "increment") {
  const result = await this.increment(parsed.amount);
  ws.send(JSON.stringify({ type: "incrementResult", result }));
}
```

### 2. Selective Broadcasting
Add filters to control which clients receive updates:

```typescript
interface SessionData {
  id: string;
  subscribedAt: string;
  filters?: {
    operationTypes?: Array<"increment" | "decrement" | "setValue" | "reset">;
  };
}
```

### 3. Enhanced Error Handling
- Retry logic with exponential backoff
- Error categorization (network vs. application errors)
- Circuit breaker pattern for repeated failures

### 4. Metrics and Monitoring
- Connection count tracking
- Message rate monitoring
- Latency measurements
- Error rate tracking

### 5. Authentication
Add session validation to WebSocket connections:

```typescript
async fetch(request: Request): Promise<Response> {
  // Validate session from query params or headers
  const token = new URL(request.url).searchParams.get("token");
  if (!isValidToken(token)) {
    return new Response("Unauthorized", { status: 401 });
  }
  // ... existing WebSocket upgrade code
}
```

## Testing

### Manual Testing

1. **Open multiple browser tabs** to the same counter
2. **Perform operations** in one tab (increment, decrement)
3. **Verify updates** appear in all other tabs in real-time
4. **Check connection status** indicator
5. **Test reconnection** by closing and reopening WebSocket

### Test Scenarios

- ✅ Single client connection
- ✅ Multiple clients to same counter
- ✅ Multiple counters with different clients
- ✅ Rapid operations (stress test broadcasting)
- ✅ Connection drop and automatic reconnection
- ✅ Hibernation and wake-up (after period of inactivity)
- ✅ Ping/pong keep-alive

## Deployment Notes

### Environment Variables

Ensure `VITE_SERVER_URL` is set correctly for the client:

```env
# Development
VITE_SERVER_URL=http://localhost:8094

# Production
VITE_SERVER_URL=https://your-server.workers.dev
```

### Cloudflare Configuration

The Alchemy configuration already includes the Counter Durable Object:

```typescript
const counter = DurableObjectNamespace("counter", {
  className: "Counter",
  sqlite: true, // Required for Drizzle ORM
});
```

### CORS Configuration

The existing CORS configuration in `apps/server/src/index.ts` handles WebSocket upgrade headers correctly.

## Conclusion

This implementation provides a robust, type-safe, and developer-friendly solution for real-time counter updates using WebSocket connections to Cloudflare Durable Objects. The architecture leverages:

- **Cloudflare WebSocket Hibernation** for efficiency
- **Hono** for routing
- **Native WebSockets** for client connections (no oRPC WebSocket needed)
- **React hooks** for easy integration
- **TanStack Query** for cache synchronization

The result is a scalable, performant real-time system that maintains consistency across all connected clients.
