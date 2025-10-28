// 5-state model matching backend
export type TaskStatus =
  | "pending"
  | "in-progress"
  | "success"
  | "failed"
  | "canceled";

export type EventType = "log" | "progress" | "error" | "success";

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
  canceledAt?: Date;
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
