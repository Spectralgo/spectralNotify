/**
 * Response types for API write operations
 */

/**
 * Idempotency metadata returned by write operations
 */
export interface IdempotencyMetadata {
  idempotencyKey: string;
  isNew: boolean;
  createdAt?: string;
}

/**
 * Response from workflow write operations
 */
export interface WorkflowWriteResponse {
  success: boolean;
  workflowId: string;
  idempotency?: IdempotencyMetadata;
}

/**
 * Response from task write operations
 */
export interface TaskWriteResponse {
  success: boolean;
  taskId: string;
  idempotency?: IdempotencyMetadata;
}

/**
 * Input type for creating workflow phases
 * Matches server's expected format with 'key' field
 */
export interface WorkflowPhaseInput {
  key: string;
  label: string;
  weight: number;
  status: "pending" | "in-progress" | "success" | "failed" | "canceled";
  progress: number;
  startedAt?: string;
  updatedAt?: string;
  completedAt?: string;
}
