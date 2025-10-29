import z from "zod";
import {
  apiKeyProcedure,
  protectedProcedure,
  publicProcedure,
  withIdempotency,
} from "../../index";
import { withIdempotency as withIdempotencySchema } from "../../schemas/idempotency";
import { notifyMetadataSchema } from "../../types/metadata";
import {
  handleAddEvent,
  handleCancelTask,
  handleCompleteTask,
  handleDeleteTask,
  handleFailTask,
  handleGetTask,
  handleGetTaskHistory,
  handleInitializeTask,
  handleUpdateProgress,
} from "./tasks.handlers";

// Define task-specific errors
const taskErrors = publicProcedure.errors({
  TASK_NOT_FOUND: {
    message: "The requested task does not exist",
    data: z.object({ taskId: z.string() }),
  },
  TASK_VALIDATION_ERROR: {
    message: "Task validation failed",
    data: z.object({ field: z.string(), reason: z.string() }),
  },
  TASK_OPERATION_FAILED: {
    message: "Task operation failed",
    data: z.object({ operation: z.string(), reason: z.string() }),
  },
});

// Zod validation schemas
const taskIdSchema = z.object({
  taskId: z
    .string()
    .min(1, "Task ID is required")
    .max(100, "Task ID must be less than 100 characters"),
});

// Align with client NotifyBroker: tasks.create({ id, status, progress?, metadata })
const createTaskSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "in-progress", "success", "failed", "canceled"]),
  progress: z.number().min(0).max(100).optional(),
  metadata: notifyMetadataSchema,
});

// Align with client NotifyBroker: tasks.addEvent({ taskId, event: { type, message, progress?, metadata? }})
const addEventSchema = z.object({
  taskId: z.string().min(1),
  event: z.object({
    type: z.enum(["log", "progress", "error", "success"]),
    message: z.string(),
    progress: z.number().min(0).max(100).optional(),
    metadata: notifyMetadataSchema.optional(),
  }),
});

const updateProgressSchema = z.object({
  taskId: z.string().min(1),
  progress: z.number().min(0).max(100),
});

const taskMetadataSchema = z.object({
  taskId: z.string().min(1),
  metadata: notifyMetadataSchema.optional(),
});

const failTaskSchema = z.object({
  taskId: z.string().min(1),
  error: z.string(),
  metadata: notifyMetadataSchema.optional(),
});

const historySchema = z.object({
  taskId: z.string().min(1),
  limit: z.number().int().positive().max(100).optional().default(50),
});

// Zod schema for TaskMetadata response
const taskMetadataResponseSchema = z.object({
  id: z.number(),
  taskId: z.string(),
  status: z.string(),
  progress: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  failedAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  metadata: z.string(),
});

// Zod schema for TaskHistory response
const taskHistoryResponseSchema = z.object({
  id: z.number(),
  eventType: z.string(),
  message: z.string(),
  progress: z.number().nullable(),
  timestamp: z.string(),
  metadata: z.string().nullable(),
});

// Zod schema for EnrichedTaskResponse
const enrichedTaskResponseSchema = z.object({
  task: taskMetadataResponseSchema,
  latestHistory: z.array(taskHistoryResponseSchema),
});

/**
 * Tasks router - uses Task Durable Objects
 */
export const tasksRouter = {
  /**
   * List all tasks from the registry (requires authentication)
   */
  listAll: protectedProcedure.handler(async ({ context }) => {
    const db = context.DB;
    if (!db) {
      throw new Error("Database not available");
    }

    // Import the schema dynamically
    const { taskRegistry } = await import("@spectralNotify/db");
    const { drizzle } = await import("drizzle-orm/d1");
    const { desc } = await import("drizzle-orm");

    const database = drizzle(db as any);

    // Fetch all tasks from the registry
    const tasks = await database
      .select()
      .from(taskRegistry)
      .orderBy(desc(taskRegistry.createdAt));

    return {
      tasks: tasks.map((t) => ({
        taskId: t.taskId,
        createdAt: t.createdAt,
        createdBy: t.createdBy,
      })),
      count: tasks.length,
    };
  }),

  /**
   * Get all tasks with full metadata (public - for monitoring)
   */
  getAll: publicProcedure.handler(async ({ context }) => {
    const db = context.DB;
    const taskBinding = context.TASK;

    if (!(db && taskBinding)) {
      throw new Error("Database or TASK binding not available");
    }

    // Import the schema dynamically
    const { taskRegistry } = await import("@spectralNotify/db");
    const { drizzle } = await import("drizzle-orm/d1");
    const { desc } = await import("drizzle-orm");

    const database = drizzle(db as any);

    // Fetch all task IDs from the registry
    const taskIds = await database
      .select()
      .from(taskRegistry)
      .orderBy(desc(taskRegistry.createdAt));

    // Fetch metadata for each task from their DOs
    const tasksWithMetadata = await Promise.all(
      taskIds.map(async (registryEntry) => {
        try {
          // biome-ignore lint: Dynamic binding type
          const task = await handleGetTask(
            taskBinding as any,
            registryEntry.taskId
          );
          // Get the latest event from history
          // biome-ignore lint: Dynamic binding type
          const history = await handleGetTaskHistory(
            taskBinding as any,
            registryEntry.taskId,
            1
          );

          return {
            id: task.taskId,
            status: task.status,
            progress: task.progress,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt),
            completedAt: task.completedAt
              ? new Date(task.completedAt)
              : undefined,
            failedAt: task.failedAt ? new Date(task.failedAt) : undefined,
            canceledAt: task.canceledAt ? new Date(task.canceledAt) : undefined,
            lastEvent: history[0]
              ? {
                  id: history[0].id.toString(),
                  timestamp: new Date(history[0].timestamp),
                  type: history[0].eventType as any,
                  message: history[0].message,
                  progress: history[0].progress ?? undefined,
                }
              : {
                  id: "0",
                  timestamp: new Date(task.createdAt),
                  type: "log" as const,
                  message: "Task created",
                },
            events: [],
          };
        } catch (error) {
          console.error(`Failed to fetch task ${registryEntry.taskId}:`, error);
          return null;
        }
      })
    );

    // Filter out any failed fetches
    const validTasks = tasksWithMetadata.filter((t) => t !== null);

    return validTasks;
  }),

  /**
   * Create a new task (requires authentication or API key)
   */
  create: apiKeyProcedure
    .use(withIdempotency)
    .input(createTaskSchema)
    .output(
      withIdempotencySchema(
        z.object({
          success: z.boolean(),
          taskId: z.string(),
        })
      )
    )
    .handler(async ({ input, context }) => {
      try {
        const taskBinding = context.TASK;
        if (!taskBinding) {
          throw new Error("TASK binding not available");
        }

        const db = context.DB;
        if (!db) {
          throw new Error("Database not available");
        }

        // Get user ID (from session or use "service" for API key auth)
        const userId = context.session?.user?.id || "service";

        // Initialize the task DO (translate to DO shape)
        await handleInitializeTask(
          // biome-ignore lint: Dynamic binding type
          taskBinding as any,
          {
            taskId: input.id,
            status: input.status,
            progress: input.progress,
            metadata: input.metadata,
          }
        );

        // Register the task in the database
        const { taskRegistry } = await import("@spectralNotify/db");
        const { drizzle } = await import("drizzle-orm/d1");
        const { eq } = await import("drizzle-orm");
        const database = drizzle(db as any);

        // Check if task already exists (idempotent)
        const existingTask = await database
          .select()
          .from(taskRegistry)
          .where(eq(taskRegistry.taskId, input.id))
          .get();

        if (!existingTask) {
          // Only insert if task doesn't exist
          await database.insert(taskRegistry).values({
            taskId: input.id,
            createdAt: new Date().toISOString(),
            createdBy: userId,
          });
        }

        return { success: true, taskId: input.id };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to create task: ${errorMessage}`);
      }
    }),

  /**
   * Get task by ID (public - for monitoring)
   */
  getById: publicProcedure
    .input(taskIdSchema)
    .handler(async ({ input, context }) => {
      try {
        const taskBinding = context.TASK;
        if (!taskBinding) {
          throw new Error("TASK binding not available");
        }

        // biome-ignore lint: Dynamic binding type
        const task = await handleGetTask(taskBinding as any, input.taskId);
        return task;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to get task: ${errorMessage}`);
      }
    }),

  /**
   * Add event to task (requires authentication or API key)
   */
  addEvent: apiKeyProcedure
    .use(withIdempotency)
    .input(addEventSchema)
    .handler(async ({ input, context }) => {
      try {
        const taskBinding = context.TASK;
        if (!taskBinding) {
          throw new Error("TASK binding not available");
        }

        const enrichedResponse = await handleAddEvent(
          // biome-ignore lint: Dynamic binding type
          taskBinding as any,
          input.taskId,
          {
            eventType: input.event.type,
            message: input.event.message,
            progress: input.event.progress,
            metadata: input.event.metadata,
          }
        );

        return enrichedResponse;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to add event: ${errorMessage}`);
      }
    }),

  /**
   * Update task progress (requires authentication or API key)
   */
  updateProgress: apiKeyProcedure
    .use(withIdempotency)
    .input(updateProgressSchema)
    .output(withIdempotencySchema(enrichedTaskResponseSchema))
    .handler(async ({ input, context }) => {
      try {
        const taskBinding = context.TASK;
        if (!taskBinding) {
          throw new Error("TASK binding not available");
        }

        const enrichedResponse = await handleUpdateProgress(
          // biome-ignore lint: Dynamic binding type
          taskBinding as any,
          input.taskId,
          input.progress
        );

        return enrichedResponse;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to update progress: ${errorMessage}`);
      }
    }),

  /**
   * Mark task as completed (requires authentication or API key)
   */
  complete: apiKeyProcedure
    .use(withIdempotency)
    .input(taskMetadataSchema)
    .output(withIdempotencySchema(enrichedTaskResponseSchema))
    .handler(async ({ input, context }) => {
      try {
        const taskBinding = context.TASK;
        if (!taskBinding) {
          throw new Error("TASK binding not available");
        }

        const enrichedResponse = await handleCompleteTask(
          // biome-ignore lint: Dynamic binding type
          taskBinding as any,
          input.taskId,
          input.metadata
        );

        return enrichedResponse;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to complete task: ${errorMessage}`);
      }
    }),

  /**
   * Mark task as failed (requires authentication or API key)
   */
  fail: apiKeyProcedure
    .use(withIdempotency)
    .input(failTaskSchema)
    .output(withIdempotencySchema(enrichedTaskResponseSchema))
    .handler(async ({ input, context }) => {
      try {
        const taskBinding = context.TASK;
        if (!taskBinding) {
          throw new Error("TASK binding not available");
        }

        const enrichedResponse = await handleFailTask(
          // biome-ignore lint: Dynamic binding type
          taskBinding as any,
          input.taskId,
          input.error,
          input.metadata
        );

        return enrichedResponse;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to fail task: ${errorMessage}`);
      }
    }),

  /**
   * Mark task as canceled (requires authentication or API key)
   */
  cancel: apiKeyProcedure
    .use(withIdempotency)
    .input(taskMetadataSchema)
    .output(withIdempotencySchema(enrichedTaskResponseSchema))
    .handler(async ({ input, context }) => {
      try {
        const taskBinding = context.TASK;
        if (!taskBinding) {
          throw new Error("TASK binding not available");
        }

        const enrichedResponse = await handleCancelTask(
          // biome-ignore lint: Dynamic binding type
          taskBinding as any,
          input.taskId,
          input.metadata
        );

        return enrichedResponse;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to cancel task: ${errorMessage}`);
      }
    }),

  /**
   * Get task event history (public - for monitoring)
   */
  getHistory: publicProcedure
    .input(historySchema)
    .handler(async ({ input, context }) => {
      try {
        const taskBinding = context.TASK;
        if (!taskBinding) {
          throw new Error("TASK binding not available");
        }

        const history = await handleGetTaskHistory(
          // biome-ignore lint: Dynamic binding type
          taskBinding as any,
          input.taskId,
          input.limit
        );
        return history;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to get history: ${errorMessage}`);
      }
    }),

  /**
   * Delete task (requires authentication)
   */
  delete: protectedProcedure
    .input(taskIdSchema)
    .handler(async ({ input, context }) => {
      try {
        const taskBinding = context.TASK;
        if (!taskBinding) {
          throw new Error("TASK binding not available");
        }

        const db = context.DB;
        if (!db) {
          throw new Error("Database not available");
        }

        // Delete the task DO storage first
        // biome-ignore lint: Dynamic binding type
        await handleDeleteTask(taskBinding as any, input.taskId);

        // Remove from the registry
        const { taskRegistry } = await import("@spectralNotify/db");
        const { drizzle } = await import("drizzle-orm/d1");
        const { eq } = await import("drizzle-orm");
        const database = drizzle(db as any);

        await database
          .delete(taskRegistry)
          .where(eq(taskRegistry.taskId, input.taskId));

        return { success: true, taskId: input.taskId };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to delete task: ${errorMessage}`);
      }
    }),

  /**
   * Delete all tasks (super admin only - requires authentication)
   * This orchestrates deletion of all task registries and their Durable Objects
   */
  deleteAll: protectedProcedure.handler(async ({ context }) => {
    try {
      const taskBinding = context.TASK;
      if (!taskBinding) {
        throw new Error("TASK binding not available");
      }

      const db = context.DB;
      if (!db) {
        throw new Error("Database not available");
      }

      // Get all tasks from registry
      const { taskRegistry } = await import("@spectralNotify/db");
      const { drizzle } = await import("drizzle-orm/d1");
      const database = drizzle(db as any);

      const allTasks = await database.select().from(taskRegistry).all();

      // Delete all task DOs in parallel
      const deletePromises = allTasks.map((task) =>
        // biome-ignore lint: Dynamic binding type
        handleDeleteTask(taskBinding as any, task.taskId).catch((error) => ({
          taskId: task.taskId,
          error: error instanceof Error ? error.message : "Unknown error",
        }))
      );

      const results = await Promise.all(deletePromises);

      // Filter out failed deletions
      const failures = results.filter(
        (r): r is { taskId: string; error: string } =>
          typeof r === "object" && "error" in r
      );

      // Delete all from registry (even if some DO deletions failed)
      await database.delete(taskRegistry);

      return {
        success: true,
        deleted: allTasks.length,
        failures: failures.length > 0 ? failures : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to delete all tasks: ${errorMessage}`);
    }
  }),
};
