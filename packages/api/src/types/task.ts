import type { NotifyMetadata } from "./metadata";

// 5-state model matching DownloadTask (1:1 mapping)
export type TaskStatus =
  | "pending"
  | "in-progress"
  | "success"
  | "failed"
  | "canceled";

export type EventType = "log" | "progress" | "error" | "success";

// Task metadata from Durable Object (matches task-schema.ts)
export interface TaskMetadata {
  id: number;
  taskId: string;
  status: string; // TaskStatus
  progress: number; // 0-100
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  canceledAt: string | null;
  metadata: string; // JSON string
}

// Task history from Durable Object (matches task-schema.ts)
export interface TaskHistory {
  id: number;
  eventType: string; // EventType
  message: string;
  progress: number | null;
  timestamp: string;
  metadata: string | null; // JSON string
}

/**
 * Helper type: TaskMetadata with parsed metadata field
 * Use this in API surfaces where metadata has been parsed from JSON
 */
export type ParsedTaskMetadata = Omit<TaskMetadata, "metadata"> & {
  parsedMetadata?: NotifyMetadata;
};

/**
 * Helper type: TaskHistory with parsed metadata field
 * Use this in API surfaces where metadata has been parsed from JSON
 */
export type ParsedTaskHistory = Omit<TaskHistory, "metadata"> & {
  parsedMetadata?: NotifyMetadata;
};

// Deprecated types (kept for backward compatibility)
export interface TaskEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  message: string;
  progress?: number;
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string; // Format: TASK-XXXX
  status: TaskStatus;
  progress?: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  failedAt?: Date;
  canceledAt?: Date; // Added for canceled state
  events: TaskEvent[];
  lastEvent: TaskEvent;
}

export interface TaskFilters {
  status?: TaskStatus;
  search?: string;
}

export interface TaskStats {
  all: number;
  pending: number;
  inProgress: number;
  success: number;
  failed: number;
  canceled: number;
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

export type WebSocketSessionData = {
  id: string;
  subscribedAt: string;
};
