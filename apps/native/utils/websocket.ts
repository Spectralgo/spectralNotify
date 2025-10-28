/**
 * WebSocket utility for React Native
 * Connects to Counter Durable Objects for real-time updates
 */

export interface CounterUpdateEvent {
  type: "increment" | "decrement" | "setValue" | "reset";
  value: number;
  previousValue: number;
  metadata: {
    id: number;
    name: string;
    value: number;
    createdAt: string;
    updatedAt: string;
    operationCount: number;
  };
  timestamp: string;
}

export type CounterWebSocketMessage =
  | CounterUpdateEvent
  | { type: "ping" }
  | { type: "pong"; timestamp: string }
  | { type: "error"; message: string };

/**
 * Create a WebSocket connection to a specific counter
 */
export function createCounterWebSocket(
  counterName: string,
  options: {
    onMessage?: (event: CounterWebSocketMessage) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
  } = {}
): WebSocket {
  const serverUrl = process.env.EXPO_PUBLIC_SERVER_URL as string;

  // Extract host from server URL (remove http:// or https://)
  const serverHost = serverUrl.replace(/^https?:\/\//, "");

  // Determine protocol based on server URL
  const protocol = serverUrl.startsWith("https://") ? "wss:" : "ws:";

  const wsUrl = `${protocol}//${serverHost}/ws/counter/${encodeURIComponent(counterName)}`;

  const ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    console.log(`WebSocket connected to counter: ${counterName}`);
    options.onOpen?.();
  });

  ws.addEventListener("message", (event) => {
    try {
      const message: CounterWebSocketMessage = JSON.parse(event.data as string);
      options.onMessage?.(message);
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  });

  ws.addEventListener("close", () => {
    console.log(`WebSocket disconnected from counter: ${counterName}`);
    options.onClose?.();
  });

  ws.addEventListener("error", (error) => {
    console.error(`WebSocket error for counter ${counterName}:`, error);
    options.onError?.(error);
  });

  return ws;
}

/**
 * Send a ping message to keep the connection alive
 */
export function sendPing(ws: WebSocket): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "ping" }));
  }
}

/**
 * Close a WebSocket connection gracefully
 */
export function closeWebSocket(ws: WebSocket): void {
  if (
    ws.readyState === WebSocket.OPEN ||
    ws.readyState === WebSocket.CONNECTING
  ) {
    ws.close(1000, "Client closing connection");
  }
}
