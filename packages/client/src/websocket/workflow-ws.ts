import type { WorkflowWebSocketMessage } from "../types";

export type ConnectionState = "disconnected" | "connecting" | "connected";

export interface WorkflowWebSocketOptions {
  onMessage?: (event: WorkflowWebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  onStateChange?: (state: ConnectionState) => void;
}

/**
 * Build WebSocket URL from server URL and path
 */
function buildWebSocketUrl(serverUrl: string, path: string): string {
  const protocol = serverUrl.startsWith("https://") ? "wss:" : "ws:";
  const serverHost = serverUrl.replace(/^https?:\/\//, "");
  return `${protocol}//${serverHost}${path}`;
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

  constructor(
    serverUrl: string,
    workflowId: string,
    options: WorkflowWebSocketOptions = {}
  ) {
    this.workflowId = workflowId;
    this.options = options;
    this.wsUrl = buildWebSocketUrl(
      serverUrl,
      `/ws/workflow/${encodeURIComponent(workflowId)}`
    );
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.options.onStateChange?.(newState);
    }
  }

  /**
   * Connect to the workflow WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setState("connecting");

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log(
          `[SpectralNotify] WebSocket connected to workflow: ${this.workflowId}`
        );
        this.setState("connected");
        this.options.onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Skip ping/pong messages
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
          `[SpectralNotify] WebSocket disconnected from workflow: ${this.workflowId}`
        );
        this.setState("disconnected");
        this.options.onClose?.();
        this.ws = null;
      };

      this.ws.onerror = (error) => {
        console.warn(
          `[SpectralNotify] WebSocket error for workflow ${this.workflowId}:`,
          error
        );
        this.setState("disconnected");
        this.options.onError?.(error);
      };
    } catch (error) {
      console.error("[SpectralNotify] Failed to create WebSocket:", error);
      this.setState("disconnected");
    }
  }

  /**
   * Close the WebSocket connection
   */
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
        console.warn("[SpectralNotify] Error during WebSocket close:", error);
      }
      this.ws = null;
    }
    this.setState("disconnected");
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.state === "connected" && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get the workflow ID this connection is for
   */
  getWorkflowId(): string {
    return this.workflowId;
  }
}

/**
 * Create a WebSocket connection to a specific workflow
 */
export function createWorkflowWebSocket(
  serverUrl: string,
  workflowId: string,
  options: WorkflowWebSocketOptions = {}
): WorkflowWebSocketConnection {
  const connection = new WorkflowWebSocketConnection(
    serverUrl,
    workflowId,
    options
  );
  connection.connect();
  return connection;
}
