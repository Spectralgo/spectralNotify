import type { TaskHistory, TaskMetadata } from "../../types/task";

interface TaskBinding {
  idFromName(taskId: string): DurableObjectId;
  get(id: DurableObjectId): TaskStub;
}

// Enriched response type for task operations
export interface EnrichedTaskResponse {
  task: TaskMetadata;
  latestHistory: TaskHistory[];
}

interface TaskStub {
  initialize(input: {
    taskId: string;
    status: string;
    progress?: number;
    metadata: Record<string, unknown>;
  }): Promise<void>;
  getTask(): Promise<TaskMetadata>;
  addEvent(event: {
    eventType: string;
    message: string;
    progress?: number;
    metadata?: Record<string, unknown>;
  }): Promise<EnrichedTaskResponse>;
  updateProgress(progress: number): Promise<EnrichedTaskResponse>;
  completeTask(
    metadata?: Record<string, unknown>
  ): Promise<EnrichedTaskResponse>;
  failTask(
    error: string,
    metadata?: Record<string, unknown>
  ): Promise<EnrichedTaskResponse>;
  cancelTask(metadata?: Record<string, unknown>): Promise<EnrichedTaskResponse>;
  getHistory(limit?: number): Promise<TaskHistory[]>;
  deleteTask(): Promise<void>;
}

/**
 * Get task stub by taskId
 */
function getTaskStub(taskBinding: TaskBinding, taskId: string): TaskStub {
  const id = taskBinding.idFromName(taskId);
  return taskBinding.get(id);
}

/**
 * Initialize a new task
 */
export async function handleInitializeTask(
  taskBinding: TaskBinding,
  input: {
    taskId: string;
    status: string;
    progress?: number;
    metadata: Record<string, unknown>;
  }
): Promise<void> {
  const receiveTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(
    `[TaskHandler] 📥 RECEIVE Task Create | taskId=${input.taskId} | status=${input.status} | timestamp=${timestamp}`
  );

  const stub = getTaskStub(taskBinding, input.taskId);
  await stub.initialize(input);

  const duration = Date.now() - receiveTime;
  console.log(
    `[TaskHandler] ✅ Task Create Handler Complete | taskId=${input.taskId} | duration=${duration}ms`
  );
}

/**
 * Get task by taskId
 */
export async function handleGetTask(
  taskBinding: TaskBinding,
  taskId: string
): Promise<TaskMetadata> {
  const stub = getTaskStub(taskBinding, taskId);
  return await stub.getTask();
}

/**
 * Add event to task
 * Returns enriched response with metadata and recent history
 */
export async function handleAddEvent(
  taskBinding: TaskBinding,
  taskId: string,
  event: {
    eventType: string;
    message: string;
    progress?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<EnrichedTaskResponse> {
  const stub = getTaskStub(taskBinding, taskId);
  return await stub.addEvent(event);
}

/**
 * Update task progress
 * Returns enriched response with metadata and recent history
 */
export async function handleUpdateProgress(
  taskBinding: TaskBinding,
  taskId: string,
  progress: number
): Promise<EnrichedTaskResponse> {
  const receiveTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(
    `[TaskHandler] 📥 RECEIVE Progress Update | taskId=${taskId} | progress=${progress}% | timestamp=${timestamp}`
  );

  const stub = getTaskStub(taskBinding, taskId);
  const result = await stub.updateProgress(progress);

  const duration = Date.now() - receiveTime;
  console.log(
    `[TaskHandler] ✅ Progress Update Handler Complete | taskId=${taskId} | progress=${progress}% | duration=${duration}ms`
  );

  return result;
}

/**
 * Mark task as completed
 * Returns enriched response with metadata and recent history
 */
export async function handleCompleteTask(
  taskBinding: TaskBinding,
  taskId: string,
  metadata?: Record<string, unknown>
): Promise<EnrichedTaskResponse> {
  const stub = getTaskStub(taskBinding, taskId);
  return await stub.completeTask(metadata);
}

/**
 * Mark task as failed
 * Returns enriched response with metadata and recent history
 */
export async function handleFailTask(
  taskBinding: TaskBinding,
  taskId: string,
  error: string,
  metadata?: Record<string, unknown>
): Promise<EnrichedTaskResponse> {
  const stub = getTaskStub(taskBinding, taskId);
  return await stub.failTask(error, metadata);
}

/**
 * Mark task as canceled
 * Returns enriched response with metadata and recent history
 */
export async function handleCancelTask(
  taskBinding: TaskBinding,
  taskId: string,
  metadata?: Record<string, unknown>
): Promise<EnrichedTaskResponse> {
  const stub = getTaskStub(taskBinding, taskId);
  return await stub.cancelTask(metadata);
}

/**
 * Get task event history
 */
export async function handleGetTaskHistory(
  taskBinding: TaskBinding,
  taskId: string,
  limit?: number
): Promise<TaskHistory[]> {
  const stub = getTaskStub(taskBinding, taskId);
  return await stub.getHistory(limit);
}

/**
 * Delete task
 */
export async function handleDeleteTask(
  taskBinding: TaskBinding,
  taskId: string
): Promise<void> {
  const stub = getTaskStub(taskBinding, taskId);
  await stub.deleteTask();
}
