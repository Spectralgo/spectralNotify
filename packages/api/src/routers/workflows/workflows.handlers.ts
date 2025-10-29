import type {
  WorkflowHistory,
  WorkflowMetadata,
  WorkflowPhase,
} from "../../types/workflow";
import type { NotifyMetadata } from "../../types/metadata";
import { createSystemAuthor } from "../../types/metadata";

interface WorkflowBinding {
  idFromName(workflowId: string): DurableObjectId;
  get(id: DurableObjectId): WorkflowStub;
}

// Enriched response type for workflow operations
export interface EnrichedWorkflowResponse {
  workflow: WorkflowMetadata;
  latestHistory: WorkflowHistory[];
}

interface WorkflowStub {
  initialize(input: {
    workflowId: string;
    status: string;
    phases: WorkflowPhase[];
    metadata: NotifyMetadata;
  }): Promise<void>;
  getWorkflow(): Promise<WorkflowMetadata>;
  getPhases(): Promise<WorkflowPhase[]>;
  updatePhaseProgress(
    phaseKey: string,
    progress: number,
    metadata?: NotifyMetadata
  ): Promise<EnrichedWorkflowResponse>;
  completePhase(
    phaseKey: string,
    metadata?: NotifyMetadata
  ): Promise<EnrichedWorkflowResponse>;
  completeWorkflow(
    metadata?: NotifyMetadata
  ): Promise<EnrichedWorkflowResponse>;
  failWorkflow(
    error: string,
    metadata?: NotifyMetadata
  ): Promise<EnrichedWorkflowResponse>;
  cancelWorkflow(
    metadata?: NotifyMetadata
  ): Promise<EnrichedWorkflowResponse>;
  getHistory(limit?: number): Promise<WorkflowHistory[]>;
  deleteWorkflow(): Promise<void>;
}

/**
 * Get workflow stub by workflowId
 */
function getWorkflowStub(
  workflowBinding: WorkflowBinding,
  workflowId: string
): WorkflowStub {
  const id = workflowBinding.idFromName(workflowId);
  return workflowBinding.get(id);
}

/**
 * Initialize a new workflow
 * Auto-populates system author if not provided
 */
export async function handleInitializeWorkflow(
  workflowBinding: WorkflowBinding,
  input: {
    workflowId: string;
    status: string;
    phases: WorkflowPhase[];
    metadata: NotifyMetadata;
  }
): Promise<void> {
  const receiveTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(
    `[WorkflowHandler] 📥 RECEIVE Workflow Create | workflowId=${input.workflowId} | status=${input.status} | timestamp=${timestamp}`
  );

  // Auto-populate system author if not provided
  const enrichedMetadata: NotifyMetadata = {
    ...input.metadata,
    author: input.metadata.author ?? createSystemAuthor(),
  };

  const stub = getWorkflowStub(workflowBinding, input.workflowId);
  await stub.initialize({
    ...input,
    metadata: enrichedMetadata,
  });

  const duration = Date.now() - receiveTime;
  console.log(
    `[WorkflowHandler] ✅ Workflow Create Handler Complete | workflowId=${input.workflowId} | duration=${duration}ms`
  );
}

/**
 * Get workflow by workflowId
 */
export async function handleGetWorkflow(
  workflowBinding: WorkflowBinding,
  workflowId: string
): Promise<WorkflowMetadata> {
  const stub = getWorkflowStub(workflowBinding, workflowId);
  return await stub.getWorkflow();
}

/**
 * Get workflow phases
 */
export async function handleGetWorkflowPhases(
  workflowBinding: WorkflowBinding,
  workflowId: string
): Promise<WorkflowPhase[]> {
  const stub = getWorkflowStub(workflowBinding, workflowId);
  return await stub.getPhases();
}

/**
 * Update workflow phase progress
 * Returns enriched response with metadata and recent history
 */
export async function handleUpdatePhaseProgress(
  workflowBinding: WorkflowBinding,
  workflowId: string,
  phaseKey: string,
  progress: number,
  metadata?: NotifyMetadata
): Promise<EnrichedWorkflowResponse> {
  const receiveTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(
    `[WorkflowHandler] 📥 RECEIVE Phase Progress Update | workflowId=${workflowId} | phase=${phaseKey} | progress=${progress}% | timestamp=${timestamp}`
  );

  const stub = getWorkflowStub(workflowBinding, workflowId);
  const result = await stub.updatePhaseProgress(phaseKey, progress, metadata);

  const duration = Date.now() - receiveTime;
  console.log(
    `[WorkflowHandler] ✅ Phase Progress Update Handler Complete | workflowId=${workflowId} | phase=${phaseKey} | progress=${progress}% | duration=${duration}ms`
  );

  return result;
}

/**
 * Mark phase as completed
 * Returns enriched response with metadata and recent history
 */
export async function handleCompletePhase(
  workflowBinding: WorkflowBinding,
  workflowId: string,
  phaseKey: string,
  metadata?: NotifyMetadata
): Promise<EnrichedWorkflowResponse> {
  const stub = getWorkflowStub(workflowBinding, workflowId);
  return await stub.completePhase(phaseKey, metadata);
}

/**
 * Mark workflow as completed
 * Returns enriched response with metadata and recent history
 */
export async function handleCompleteWorkflow(
  workflowBinding: WorkflowBinding,
  workflowId: string,
  metadata?: NotifyMetadata
): Promise<EnrichedWorkflowResponse> {
  const stub = getWorkflowStub(workflowBinding, workflowId);
  return await stub.completeWorkflow(metadata);
}

/**
 * Mark workflow as failed
 * Returns enriched response with metadata and recent history
 */
export async function handleFailWorkflow(
  workflowBinding: WorkflowBinding,
  workflowId: string,
  error: string,
  metadata?: NotifyMetadata
): Promise<EnrichedWorkflowResponse> {
  const stub = getWorkflowStub(workflowBinding, workflowId);
  return await stub.failWorkflow(error, metadata);
}

/**
 * Mark workflow as canceled
 * Returns enriched response with metadata and recent history
 */
export async function handleCancelWorkflow(
  workflowBinding: WorkflowBinding,
  workflowId: string,
  metadata?: NotifyMetadata
): Promise<EnrichedWorkflowResponse> {
  const stub = getWorkflowStub(workflowBinding, workflowId);
  return await stub.cancelWorkflow(metadata);
}

/**
 * Get workflow event history
 */
export async function handleGetWorkflowHistory(
  workflowBinding: WorkflowBinding,
  workflowId: string,
  limit?: number
): Promise<WorkflowHistory[]> {
  const stub = getWorkflowStub(workflowBinding, workflowId);
  return await stub.getHistory(limit);
}

/**
 * Delete workflow
 */
export async function handleDeleteWorkflow(
  workflowBinding: WorkflowBinding,
  workflowId: string
): Promise<void> {
  const stub = getWorkflowStub(workflowBinding, workflowId);
  await stub.deleteWorkflow();
}
