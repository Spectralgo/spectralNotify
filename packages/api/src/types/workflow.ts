// 5-state model matching Task (1:1 mapping)
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
 * Phase definition structure
 */
export interface WorkflowPhase {
  key: string; // e.g., "download", "transcription"
  label: string; // e.g., "Download", "Transcription"
  weight: number; // 0-1, used for computing overall progress (e.g., 0.4, 0.6)
  status: "pending" | "in-progress" | "success" | "failed" | "canceled";
  progress: number; // 0-100
  startedAt?: string; // ISO timestamp
  updatedAt?: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
}

// Workflow metadata from Durable Object (matches workflow-schema.ts)
export interface WorkflowMetadata {
  id: number;
  workflowId: string;
  status: string; // WorkflowStatus
  overallProgress: number; // 0-100
  expectedPhaseCount: number;
  completedPhaseCount: number;
  activePhaseKey: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  canceledAt: string | null;
  metadata: string; // JSON string
}

// Workflow history from Durable Object (matches workflow-schema.ts)
export interface WorkflowHistory {
  id: number;
  workflowId: string; // Explicit workflow reference
  eventType: string; // WorkflowEventType
  phaseKey: string | null; // Which phase this event relates to
  message: string;
  progress: number | null;
  timestamp: string;
  metadata: string | null; // JSON string
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

export type WebSocketSessionData = {
  id: string;
  subscribedAt: string;
};
