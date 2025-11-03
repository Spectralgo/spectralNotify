import type { WorkflowWebSocketMessage } from "../types";

export interface WorkflowWebSocketOptions {
  onMessage?: (event: WorkflowWebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

/**
 * Create a WebSocket connection to a specific workflow
 */
export function createWorkflowWebSocket(
  serverUrl: string,
  workflowId: string,
  options: WorkflowWebSocketOptions = {}
): WebSocket {
  const protocol = serverUrl.startsWith("https://") ? "wss:" : "ws:";
  const serverHost = serverUrl.replace(/^https?:\/\//, "");
  const wsUrl = `${protocol}//${serverHost}/ws/workflow/${encodeURIComponent(workflowId)}`;

  const ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    console.log(`[SpectralNotify] WebSocket connected to workflow: ${workflowId}`);
    options.onOpen?.();
  });

  ws.addEventListener("message", (event) => {
    try {
      const message: WorkflowWebSocketMessage = JSON.parse(event.data);
      options.onMessage?.(message);
    } catch (error) {
      console.error("[SpectralNotify] Failed to parse WebSocket message:", error);
    }
  });

  ws.addEventListener("close", () => {
    console.log(`[SpectralNotify] WebSocket disconnected from workflow: ${workflowId}`);
    options.onClose?.();
  });

  ws.addEventListener("error", (error) => {
    console.error(`[SpectralNotify] WebSocket error for workflow ${workflowId}:`, error);
    options.onError?.(error);
  });

  return ws;
}
