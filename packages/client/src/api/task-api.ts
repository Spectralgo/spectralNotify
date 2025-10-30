import type { ApiClient } from "./client";
import type {
  TaskHistory,
  TaskMetadata,
  TaskWriteResponse,
  NotifyMetadata,
} from "../types";

/**
 * Task API client
 */
export class TaskApi {
  constructor(private client: ApiClient) {}

  /**
   * Get task by ID
   */
  async getById(taskId: string): Promise<TaskMetadata> {
    return this.client.post<{ taskId: string }, TaskMetadata>(
      "tasks.getById",
      { taskId }
    );
  }

  /**
   * Get task history
   */
  async getHistory(taskId: string, limit = 50): Promise<TaskHistory[]> {
    return this.client.post<{ taskId: string; limit: number }, TaskHistory[]>(
      "tasks.getHistory",
      { taskId, limit }
    );
  }

  /**
   * Create a new task
   * @param id - Unique task ID
   * @param status - Initial task status
   * @param progress - Initial progress (0-100)
   * @param metadata - Task metadata (author, origin, purpose, tags)
   */
  async create(
    id: string,
    status: string,
    progress: number,
    metadata: NotifyMetadata
  ): Promise<TaskWriteResponse> {
    return this.client.post<
      {
        id: string;
        status: string;
        progress: number;
        metadata: NotifyMetadata;
      },
      TaskWriteResponse
    >("tasks.create", {
      id,
      status,
      progress,
      metadata,
    });
  }

  /**
   * Update task progress
   * @param taskId - The task ID
   * @param progress - Progress percentage (0-100)
   */
  async updateProgress(
    taskId: string,
    progress: number
  ): Promise<TaskWriteResponse> {
    return this.client.post<
      {
        taskId: string;
        progress: number;
      },
      TaskWriteResponse
    >("tasks.updateProgress", {
      taskId,
      progress,
    });
  }

  /**
   * Mark task as completed
   * @param taskId - The task ID
   * @param metadata - Optional completion metadata
   */
  async complete(
    taskId: string,
    metadata?: NotifyMetadata
  ): Promise<TaskWriteResponse> {
    return this.client.post<
      {
        taskId: string;
        metadata?: NotifyMetadata;
      },
      TaskWriteResponse
    >("tasks.complete", {
      taskId,
      metadata,
    });
  }

  /**
   * Mark task as failed
   * @param taskId - The task ID
   * @param error - Error message
   * @param metadata - Optional error metadata
   */
  async fail(
    taskId: string,
    error: string,
    metadata?: NotifyMetadata
  ): Promise<TaskWriteResponse> {
    return this.client.post<
      {
        taskId: string;
        error: string;
        metadata?: NotifyMetadata;
      },
      TaskWriteResponse
    >("tasks.fail", {
      taskId,
      error,
      metadata,
    });
  }

  /**
   * Cancel a task
   * @param taskId - The task ID
   * @param metadata - Optional cancellation metadata
   */
  async cancel(
    taskId: string,
    metadata?: NotifyMetadata
  ): Promise<TaskWriteResponse> {
    return this.client.post<
      {
        taskId: string;
        metadata?: NotifyMetadata;
      },
      TaskWriteResponse
    >("tasks.cancel", {
      taskId,
      metadata,
    });
  }
}
