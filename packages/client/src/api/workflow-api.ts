import type { ApiClient } from "./client";
import type {
  WorkflowHistory,
  WorkflowMetadata,
  WorkflowPhase,
  WorkflowPhaseInput,
  WorkflowWriteResponse,
  NotifyMetadata,
} from "../types";

/**
 * Workflow API client
 */
export class WorkflowApi {
  constructor(private client: ApiClient) {}

  /**
   * Get workflow by ID
   */
  async getById(workflowId: string): Promise<WorkflowMetadata> {
    return this.client.post<{ workflowId: string }, WorkflowMetadata>(
      "/workflows/getById",
      { workflowId }
    );
  }

  /**
   * Get workflow phases
   */
  async getPhases(workflowId: string): Promise<WorkflowPhase[]> {
    return this.client.post<{ workflowId: string }, WorkflowPhase[]>(
      "/workflows/getPhases",
      { workflowId }
    );
  }

  /**
   * Get workflow history
   */
  async getHistory(
    workflowId: string,
    limit = 50
  ): Promise<WorkflowHistory[]> {
    return this.client.post<
      { workflowId: string; limit: number },
      WorkflowHistory[]
    >("/workflows/getHistory", { workflowId, limit });
  }

  /**
   * Create a new workflow
   * @param id - Unique workflow ID
   * @param phases - Array of workflow phase definitions
   * @param metadata - Workflow metadata (author, origin, purpose, tags)
   */
  async create(
    id: string,
    phases: WorkflowPhaseInput[],
    metadata: NotifyMetadata
  ): Promise<WorkflowWriteResponse> {
    // Add required server fields to phases
    const phasesWithDefaults = phases.map((phase) => ({
      ...phase,
      status: "pending" as const,
      progress: 0,
    }));

    return this.client.post<
      {
        id: string;
        status: string;
        phases: Array<WorkflowPhaseInput & { status: string; progress: number }>;
        metadata: NotifyMetadata;
      },
      WorkflowWriteResponse
    >("/workflows/create", {
      id,
      status: "in-progress",
      phases: phasesWithDefaults,
      metadata,
    });
  }

  /**
   * Update progress for a workflow phase
   * @param workflowId - The workflow ID
   * @param phase - The phase key to update
   * @param progress - Progress percentage (0-100)
   * @param metadata - Optional metadata for this update
   */
  async updatePhaseProgress(
    workflowId: string,
    phase: string,
    progress: number,
    metadata?: NotifyMetadata
  ): Promise<WorkflowWriteResponse> {
    return this.client.post<
      {
        workflowId: string;
        phase: string;
        progress: number;
        metadata?: NotifyMetadata;
      },
      WorkflowWriteResponse
    >("/workflows/updatePhaseProgress", {
      workflowId,
      phase,
      progress,
      metadata,
    });
  }

  /**
   * Mark a workflow phase as completed
   * @param workflowId - The workflow ID
   * @param phase - The phase key to complete
   * @param metadata - Optional completion metadata
   */
  async completePhase(
    workflowId: string,
    phase: string,
    metadata?: NotifyMetadata
  ): Promise<WorkflowWriteResponse> {
    return this.client.post<
      {
        workflowId: string;
        phase: string;
        metadata?: NotifyMetadata;
      },
      WorkflowWriteResponse
    >("/workflows/completePhase", {
      workflowId,
      phase,
      metadata,
    });
  }

  /**
   * Mark workflow as completed
   * @param workflowId - The workflow ID
   * @param metadata - Optional completion metadata
   */
  async complete(
    workflowId: string,
    metadata?: NotifyMetadata
  ): Promise<WorkflowWriteResponse> {
    return this.client.post<
      {
        workflowId: string;
        metadata?: NotifyMetadata;
      },
      WorkflowWriteResponse
    >("/workflows/complete", {
      workflowId,
      metadata,
    });
  }

  /**
   * Mark workflow as failed
   * @param workflowId - The workflow ID
   * @param error - Error message
   * @param metadata - Optional error metadata
   */
  async fail(
    workflowId: string,
    error: string,
    metadata?: NotifyMetadata
  ): Promise<WorkflowWriteResponse> {
    return this.client.post<
      {
        workflowId: string;
        error: string;
        metadata?: NotifyMetadata;
      },
      WorkflowWriteResponse
    >("/workflows/fail", {
      workflowId,
      error,
      metadata,
    });
  }

  /**
   * Cancel a workflow
   * @param workflowId - The workflow ID
   * @param metadata - Optional cancellation metadata
   */
  async cancel(
    workflowId: string,
    metadata?: NotifyMetadata
  ): Promise<WorkflowWriteResponse> {
    return this.client.post<
      {
        workflowId: string;
        metadata?: NotifyMetadata;
      },
      WorkflowWriteResponse
    >("/workflows/cancel", {
      workflowId,
      metadata,
    });
  }
}
