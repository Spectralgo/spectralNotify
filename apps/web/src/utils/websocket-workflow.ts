import type { WorkflowWebSocketMessage } from "@spectralNotify/api/types/workflow";

/**
 * Create a WebSocket connection to a specific workflow
 */
export function createWorkflowWebSocket(
  workflowId: string,
  options: {
    onMessage?: (event: WorkflowWebSocketMessage) => void;
    onOpen?: () => void;
    onClose?: () => void;
    onError?: (error: Event) => void;
  } = {}
): WebSocket {
  const protocol =
    (globalThis as any).window?.location.protocol === "https:" ? "wss:" : "ws:";
  const serverUrl = (import.meta as any).env?.VITE_SERVER_URL as string;

  // Extract host from server URL (remove http:// or https://)
  const serverHost = serverUrl.replace(/^https?:\/\//, "");

  const wsUrl = `${protocol}//${serverHost}/ws/workflow/${encodeURIComponent(workflowId)}`;

  const ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    console.log(`WebSocket connected to workflow: ${workflowId}`);
    options.onOpen?.();
  });

  ws.addEventListener("message", (event) => {
    try {
      const message: WorkflowWebSocketMessage = JSON.parse(event.data);
      options.onMessage?.(message);
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  });

  ws.addEventListener("close", () => {
    console.log(`WebSocket disconnected from workflow: ${workflowId}`);
    options.onClose?.();
  });

  ws.addEventListener("error", (error) => {
    console.error(`WebSocket error for workflow ${workflowId}:`, error);
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
