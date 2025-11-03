// Provider
export { SpectralNotifyProvider, useSpectralNotifyContext } from "./provider";
export type { SpectralNotifyConfig, SpectralNotifyProviderProps } from "./provider";

// Hooks
export { useWorkflow, useTask } from "./hooks";
export type { UseWorkflowOptions, UseTaskOptions } from "./hooks";

// Types
export type {
  // Workflow types
  Workflow,
  WorkflowEvent,
  WorkflowMetadata,
  WorkflowHistory,
  WorkflowPhase,
  WorkflowStatus,
  WorkflowEventType,
  WorkflowUpdateEvent,
  WorkflowWebSocketMessage,
  // Task types
  Task,
  TaskEvent,
  TaskMetadata,
  TaskHistory,
  TaskStatus,
  EventType,
  TaskUpdateEvent,
  TaskWebSocketMessage,
  // Metadata types
  NotifyMetadata,
  AuthorInfo,
  OriginInfo,
  PurposeInfo,
  // API response types
  WorkflowWriteResponse,
  TaskWriteResponse,
  WorkflowPhaseInput,
  IdempotencyMetadata,
} from "./types";

// API clients (for advanced usage)
export { ApiClient, WorkflowApi, TaskApi } from "./api";
export type { ApiClientConfig } from "./api";

// WebSocket utilities (for advanced usage)
export {
  createWorkflowWebSocket,
  createTaskWebSocket,
  sendPing,
  closeWebSocket,
} from "./websocket";
export type { WorkflowWebSocketOptions, TaskWebSocketOptions } from "./websocket";
