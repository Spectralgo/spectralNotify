import type { TaskWebSocketMessage } from "../types";

export interface TaskWebSocketOptions {
  onMessage?: (event: TaskWebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

/**
 * Create a WebSocket connection to a specific task
 */
export function createTaskWebSocket(
  serverUrl: string,
  taskId: string,
  options: TaskWebSocketOptions = {}
): WebSocket {
  const protocol = serverUrl.startsWith("https://") ? "wss:" : "ws:";
  const serverHost = serverUrl.replace(/^https?:\/\//, "");
  const wsUrl = `${protocol}//${serverHost}/ws/task/${encodeURIComponent(taskId)}`;

  const ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    console.log(`[SpectralNotify] WebSocket connected to task: ${taskId}`);
    options.onOpen?.();
  });

  ws.addEventListener("message", (event) => {
    try {
      const message: TaskWebSocketMessage = JSON.parse(event.data);
      options.onMessage?.(message);
    } catch (error) {
      console.error("[SpectralNotify] Failed to parse WebSocket message:", error);
    }
  });

  ws.addEventListener("close", () => {
    console.log(`[SpectralNotify] WebSocket disconnected from task: ${taskId}`);
    options.onClose?.();
  });

  ws.addEventListener("error", (error) => {
    console.error(`[SpectralNotify] WebSocket error for task ${taskId}:`, error);
    options.onError?.(error);
  });

  return ws;
}
