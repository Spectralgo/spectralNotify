/**
 * WebSocket utility for React Native - Task Durable Objects
 * Connects to Task Durable Objects for real-time updates
 */

import type { TaskWebSocketMessage } from "@spectralNotify/api/types/task";

/**
 * Create a WebSocket connection to a specific task
 */
export function createTaskWebSocket(
  taskId: string,
  options: {
    onMessage?: (event: TaskWebSocketMessage) => void;
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

  const wsUrl = `${protocol}//${serverHost}/ws/task/${encodeURIComponent(taskId)}`;

  const ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    console.log(`WebSocket connected to task: ${taskId}`);
    options.onOpen?.();
  });

  ws.addEventListener("message", (event) => {
    try {
      const message: TaskWebSocketMessage = JSON.parse(event.data as string);
      options.onMessage?.(message);
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  });

  ws.addEventListener("close", () => {
    console.log(`WebSocket disconnected from task: ${taskId}`);
    options.onClose?.();
  });

  ws.addEventListener("error", (error) => {
    console.error(`WebSocket error for task ${taskId}:`, error);
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
