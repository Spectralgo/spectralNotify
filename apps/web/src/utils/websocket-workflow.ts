import type { WorkflowWebSocketMessage } from "@spectralNotify/api/types/workflow";

export type ConnectionState = "disconnected" | "connecting" | "connected";

export interface WorkflowWebSocketOptions {
  onMessage?: (event: WorkflowWebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onStateChange?: (state: ConnectionState) => void;
}

/**
 * Simple workflow WebSocket connection
 */
export class WorkflowWebSocketConnection {
  private ws: WebSocket | null = null;
  private workflowId: string;
  private wsUrl: string;
  private options: WorkflowWebSocketOptions;
  private state: ConnectionState = "disconnected";

  constructor(workflowId: string, options: WorkflowWebSocketOptions = {}) {
    this.workflowId = workflowId;
    this.options = options;

    // Build WebSocket URL
    const protocol =
      (globalThis as any).window?.location.protocol === "https:" ? "wss:" : "ws:";
    const serverUrl = (import.meta as any).env?.VITE_SERVER_URL as string;
    const serverHost = serverUrl.replace(/^https?:\/\//, "");
    this.wsUrl = `${protocol}//${serverHost}/ws/workflow/${encodeURIComponent(workflowId)}`;
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.options.onStateChange?.(newState);
    }
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setState("connecting");

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log(
          `[WorkflowWebSocket] Connected to workflow: ${this.workflowId}`
        );
        this.setState("connected");
        this.options.onOpen?.();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          // Skip pong messages
          if (data.type === "pong") {
            return;
          }
          this.options.onMessage?.(data as WorkflowWebSocketMessage);
        } catch {
          // If not JSON, ignore
        }
      };

      this.ws.onclose = () => {
        console.log(
          `[WorkflowWebSocket] Disconnected from workflow: ${this.workflowId}`
        );
        this.setState("disconnected");
        this.options.onClose?.();
        this.ws = null;
      };

      this.ws.onerror = (error: Event) => {
        console.warn(
          `[WorkflowWebSocket] Error for workflow ${this.workflowId}:`,
          error
        );
        this.setState("disconnected");
        this.options.onError?.(error);
      };
    } catch (error) {
      console.error("[WorkflowWebSocket] Failed to create WebSocket:", error);
      this.setState("disconnected");
    }
  }

  close(): void {
    if (this.ws) {
      try {
        if (
          this.ws.readyState === WebSocket.OPEN ||
          this.ws.readyState === WebSocket.CONNECTING
        ) {
          this.ws.close(1000, "Client closing connection");
        }
      } catch (error) {
        // Ignore close errors - WebSocket may already be closing
        console.warn("[WorkflowWebSocket] Error during close:", error);
      }
      this.ws = null;
    }
    this.setState("disconnected");
  }

  getState(): ConnectionState {
    return this.state;
  }

  isConnected(): boolean {
    return this.state === "connected" && this.ws?.readyState === WebSocket.OPEN;
  }

  getWorkflowId(): string {
    return this.workflowId;
  }
}

/**
 * Create a WebSocket connection to a specific workflow
 */
export function createWorkflowWebSocket(
  workflowId: string,
  options: WorkflowWebSocketOptions = {}
): WorkflowWebSocketConnection {
  const connection = new WorkflowWebSocketConnection(workflowId, options);
  connection.connect();
  return connection;
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
export function closeWebSocket(ws: WebSocket | WorkflowWebSocketConnection): void {
  if (ws instanceof WorkflowWebSocketConnection) {
    ws.close();
    return;
  }
  try {
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      ws.close(1000, "Client closing connection");
    }
  } catch (error) {
    // Ignore close errors
    console.warn("[WorkflowWebSocket] Error during close:", error);
  }
}
