import type { TaskWebSocketMessage } from "../types";
import type { ConnectionState } from "./workflow-ws";

export interface TaskWebSocketOptions {
  onMessage?: (event: TaskWebSocketMessage) => void;
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
 * Simple task WebSocket connection for React Native
 */
export class TaskWebSocketConnection {
  private ws: WebSocket | null = null;
  private taskId: string;
  private wsUrl: string;
  private options: TaskWebSocketOptions;
  private state: ConnectionState = "disconnected";

  constructor(
    serverUrl: string,
    taskId: string,
    options: TaskWebSocketOptions = {}
  ) {
    this.taskId = taskId;
    this.options = options;
    this.wsUrl = buildWebSocketUrl(
      serverUrl,
      `/ws/task/${encodeURIComponent(taskId)}`
    );
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.options.onStateChange?.(newState);
    }
  }

  /**
   * Connect to the task WebSocket
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.setState("connecting");

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log(`[SpectralNotify] WebSocket connected to task: ${this.taskId}`);
        this.setState("connected");
        this.options.onOpen?.();
      };

      this.ws.onmessage = (event: WebSocketMessageEvent) => {
        try {
          const data = JSON.parse(event.data as string);
          // Skip ping/pong messages
          if (data.type === "pong") {
            return;
          }
          this.options.onMessage?.(data as TaskWebSocketMessage);
        } catch {
          // If not JSON, ignore
        }
      };

      this.ws.onclose = () => {
        console.log(
          `[SpectralNotify] WebSocket disconnected from task: ${this.taskId}`
        );
        this.setState("disconnected");
        this.options.onClose?.();
        this.ws = null;
      };

      this.ws.onerror = (error: Event) => {
        console.warn(
          `[SpectralNotify] WebSocket error for task ${this.taskId}:`,
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
   * Get the task ID this connection is for
   */
  getTaskId(): string {
    return this.taskId;
  }
}

/**
 * Create a WebSocket connection to a specific task
 */
export function createTaskWebSocket(
  serverUrl: string,
  taskId: string,
  options: TaskWebSocketOptions = {}
): TaskWebSocketConnection {
  const connection = new TaskWebSocketConnection(serverUrl, taskId, options);
  connection.connect();
  return connection;
}

// Re-export ConnectionState type
export type { ConnectionState } from "./workflow-ws";
