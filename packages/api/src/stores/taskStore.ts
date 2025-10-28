import type {
  EventType,
  Task,
  TaskEvent,
  TaskFilters,
  TaskStats,
  TaskStatus,
} from "../types/task";

// In-memory task store with CRUD operations
class TaskStore {
  private tasks: Map<string, Task> = new Map();

  constructor() {
    // Initialize with empty store (no mock data)
  }

  /**
   * Create a new task
   */
  createTask(input: {
    id: string;
    status: TaskStatus;
    progress?: number;
    metadata: Record<string, unknown>;
  }): Task {
    // Check if task already exists
    if (this.tasks.has(input.id)) {
      throw new Error(`Task ${input.id} already exists`);
    }

    const now = new Date();
    const initialEvent: TaskEvent = {
      id: `event-${Date.now()}`,
      timestamp: now,
      type: "log",
      message: "Task created",
      metadata: input.metadata,
    };

    const task: Task = {
      id: input.id,
      status: input.status,
      progress: input.progress ?? 0,
      createdAt: now,
      updatedAt: now,
      events: [initialEvent],
      lastEvent: initialEvent,
    };

    this.tasks.set(input.id, task);
    return task;
  }

  /**
   * Add an event to an existing task
   */
  addEvent(
    taskId: string,
    eventInput: {
      type: EventType;
      message: string;
      progress?: number;
      metadata?: Record<string, unknown>;
    }
  ): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const event: TaskEvent = {
      id: `event-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      ...eventInput,
    };

    task.events.push(event);
    task.lastEvent = event;
    task.updatedAt = new Date();

    // Update progress if provided in event
    if (event.progress !== undefined) {
      task.progress = event.progress;
    }
  }

  /**
   * Update task progress
   */
  updateProgress(taskId: string, progress: number): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.progress = progress;
    task.updatedAt = new Date();
  }

  /**
   * Mark task as completed
   */
  completeTask(taskId: string, metadata?: Record<string, unknown>): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = "success";
    task.progress = 100;
    task.completedAt = new Date();
    task.updatedAt = new Date();

    // Add completion event
    this.addEvent(taskId, {
      type: "success",
      message: "Task completed successfully",
      progress: 100,
      metadata,
    });
  }

  /**
   * Mark task as failed
   */
  failTask(
    taskId: string,
    error: string,
    metadata?: Record<string, unknown>
  ): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = "failed";
    task.failedAt = new Date();
    task.updatedAt = new Date();

    // Add failure event
    this.addEvent(taskId, {
      type: "error",
      message: error,
      metadata,
    });
  }

  /**
   * Mark task as canceled
   */
  cancelTask(taskId: string, metadata?: Record<string, unknown>): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.status = "canceled";
    task.canceledAt = new Date();
    task.updatedAt = new Date();

    // Add cancellation event
    this.addEvent(taskId, {
      type: "error",
      message: "Task canceled",
      metadata,
    });
  }

  /**
   * Get tasks with optional filtering
   */
  getTasks(filters?: TaskFilters): Task[] {
    let tasks = Array.from(this.tasks.values());

    // Apply status filter
    if (filters?.status) {
      tasks = tasks.filter((t) => t.status === filters.status);
    }

    // Apply search filter (search by task ID)
    if (filters?.search) {
      const query = filters.search.toLowerCase();
      tasks = tasks.filter((t) => t.id.toLowerCase().includes(query));
    }

    // Sort by most recently updated first
    return tasks.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  /**
   * Get a single task by ID
   */
  getTaskById(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get task statistics (counts by status)
   */
  getTaskStats(): TaskStats {
    const tasks = Array.from(this.tasks.values());
    return {
      all: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      inProgress: tasks.filter((t) => t.status === "in-progress").length,
      success: tasks.filter((t) => t.status === "success").length,
      failed: tasks.filter((t) => t.status === "failed").length,
      canceled: tasks.filter((t) => t.status === "canceled").length,
    };
  }

  /**
   * Reset the store (for testing)
   */
  reset(): void {
    this.tasks.clear();
  }
}

// Export a singleton instance
export const taskStore = new TaskStore();
