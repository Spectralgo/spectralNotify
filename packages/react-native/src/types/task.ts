export type TaskStatus =
  | "pending"
  | "in-progress"
  | "success"
  | "failed"
  | "canceled";

export type EventType = "log" | "progress" | "error" | "success";

/**
 * Task metadata from server
 */
export interface TaskMetadata {
  id: number;
  taskId: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  canceledAt: string | null;
  metadata: string;
}

/**
 * Task history event from server
 */
export interface TaskHistory {
  id: number;
  eventType: string;
  message: string;
  progress: number | null;
  timestamp: string;
  metadata: string | null;
}

/**
 * Transformed task event for client consumption
 */
export interface TaskEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  message: string;
  progress?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Complete task data with all related entities
 */
export interface Task {
  id: string;
  status: TaskStatus;
  progress?: number;
  events: TaskEvent[];
  lastUpdate?: string;
  metadata?: string;
}

/**
 * WebSocket event types for real-time task updates
 */
export type TaskUpdateEvent =
  | {
      type: "event";
      taskId: string;
      event: {
        eventType: string;
        message: string;
        progress?: number;
        timestamp: string;
      };
      task: TaskMetadata;
      timestamp: string;
    }
  | {
      type: "progress";
      taskId: string;
      progress: number;
      task: TaskMetadata;
      timestamp: string;
    }
  | {
      type: "complete";
      taskId: string;
      task: TaskMetadata;
      timestamp: string;
    }
  | {
      type: "fail";
      taskId: string;
      error: string;
      task: TaskMetadata;
      timestamp: string;
    }
  | {
      type: "cancel";
      taskId: string;
      task: TaskMetadata;
      timestamp: string;
    };

export type TaskWebSocketMessage =
  | TaskUpdateEvent
  | { type: "ping" }
  | { type: "pong"; timestamp: string }
  | { type: "error"; message: string };
