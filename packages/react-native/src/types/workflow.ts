export type WorkflowStatus =
  | "pending"
  | "in-progress"
  | "success"
  | "failed"
  | "canceled";

export type WorkflowEventType =
  | "log"
  | "phase-progress"
  | "workflow-progress"
  | "error"
  | "success"
  | "cancel";

/**
 * Phase definition structure from server
 * Supports hierarchical phases via parentPhaseKey
 */
export interface WorkflowPhase {
  workflowId: string;
  phaseKey: string;
  label: string;
  weight: number;
  status: "pending" | "in-progress" | "success" | "failed" | "canceled";
  progress: number;
  order: number;
  parentPhaseKey?: string | null; // null for top-level phases, parent key for children
  depth?: number; // 0 for top-level, 1+ for nested
  startedAt?: string | null;
  updatedAt?: string | null;
  completedAt?: string | null;
}

/**
 * Workflow metadata from server
 */
export interface WorkflowMetadata {
  id: number;
  workflowId: string;
  status: string;
  overallProgress: number;
  expectedPhaseCount: number;
  completedPhaseCount: number;
  activePhaseKey: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  canceledAt: string | null;
  metadata: string;
}

/**
 * Workflow history event from server
 */
export interface WorkflowHistory {
  id: number;
  workflowId: string;
  eventType: string;
  phaseKey: string | null;
  message: string;
  progress: number | null;
  timestamp: string;
  metadata: string | null;
}

/**
 * Transformed workflow event for client consumption
 */
export interface WorkflowEvent {
  id: string;
  timestamp: Date;
  type: WorkflowEventType;
  phaseKey?: string;
  message: string;
  progress?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Complete workflow data with all related entities
 */
export interface Workflow {
  id: string;
  status: WorkflowStatus;
  overallProgress: number;
  expectedPhaseCount?: number;
  completedPhaseCount?: number;
  activePhaseKey?: string | null;
  phases: WorkflowPhase[];
  events: WorkflowEvent[];
  lastUpdate?: string;
  metadata?: string;
}

/**
 * WebSocket event types for real-time workflow updates
 */
export type WorkflowUpdateEvent =
  | {
      type: "phase-progress";
      workflowId: string;
      phase: string;
      progress: number;
      overallProgress: number;
      workflow: WorkflowMetadata;
      phases: WorkflowPhase[];
      timestamp: string;
    }
  | {
      type: "workflow-progress";
      workflowId: string;
      overallProgress: number;
      workflow: WorkflowMetadata;
      phases: WorkflowPhase[];
      timestamp: string;
    }
  | {
      type: "complete";
      workflowId: string;
      workflow: WorkflowMetadata;
      phases: WorkflowPhase[];
      timestamp: string;
    }
  | {
      type: "fail";
      workflowId: string;
      error: string;
      workflow: WorkflowMetadata;
      phases: WorkflowPhase[];
      timestamp: string;
    }
  | {
      type: "cancel";
      workflowId: string;
      workflow: WorkflowMetadata;
      phases: WorkflowPhase[];
      timestamp: string;
    };

export type WorkflowWebSocketMessage =
  | WorkflowUpdateEvent
  | { type: "ping" }
  | { type: "pong"; timestamp: string }
  | { type: "error"; message: string };
