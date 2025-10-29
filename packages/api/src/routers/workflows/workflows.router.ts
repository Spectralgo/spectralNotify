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
  handleCancelWorkflow,
  handleCompletePhase,
  handleCompleteWorkflow,
  handleDeleteWorkflow,
  handleFailWorkflow,
  handleGetWorkflow,
  handleGetWorkflowHistory,
  handleGetWorkflowPhases,
  handleInitializeWorkflow,
  handleUpdatePhaseProgress,
} from "./workflows.handlers";

// Define workflow-specific errors
const workflowErrors = publicProcedure.errors({
  WORKFLOW_NOT_FOUND: {
    message: "The requested workflow does not exist",
    data: z.object({ workflowId: z.string() }),
  },
  WORKFLOW_VALIDATION_ERROR: {
    message: "Workflow validation failed",
    data: z.object({ field: z.string(), reason: z.string() }),
  },
  WORKFLOW_OPERATION_FAILED: {
    message: "Workflow operation failed",
    data: z.object({ operation: z.string(), reason: z.string() }),
  },
});

// Zod validation schemas
const workflowIdSchema = z.object({
  workflowId: z
    .string()
    .min(1, "Workflow ID is required")
    .max(100, "Workflow ID must be less than 100 characters"),
});

const workflowPhaseSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  weight: z.number().min(0).max(1),
  status: z.enum(["pending", "in-progress", "success", "failed", "canceled"]),
  progress: z.number().min(0).max(100),
  startedAt: z.string().optional(),
  updatedAt: z.string().optional(),
  completedAt: z.string().optional(),
});

const createWorkflowSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "in-progress", "success", "failed", "canceled"]),
  phases: z
    .array(workflowPhaseSchema)
    .min(1, "At least one phase required")
    .refine(
      (phases) => {
        const keys = phases.map((p) => p.key);
        return keys.length === new Set(keys).size;
      },
      { message: "Phase keys must be unique" }
    )
    .refine(
      (phases) => {
        const totalWeight = phases.reduce((sum, p) => sum + p.weight, 0);
        return Math.abs(totalWeight - 1.0) < 0.001;
      },
      { message: "Phase weights must sum to 1.0" }
    ),
  metadata: notifyMetadataSchema,
});

const updatePhaseProgressSchema = z.object({
  workflowId: z.string().min(1),
  phase: z.string().min(1),
  progress: z.number().min(0).max(100),
  metadata: notifyMetadataSchema.optional(),
});

const completePhaseSchema = z.object({
  workflowId: z.string().min(1),
  phase: z.string().min(1),
  metadata: notifyMetadataSchema.optional(),
});

const workflowMetadataSchema = z.object({
  workflowId: z.string().min(1),
  metadata: notifyMetadataSchema.optional(),
});

const failWorkflowSchema = z.object({
  workflowId: z.string().min(1),
  error: z.string(),
  metadata: notifyMetadataSchema.optional(),
});

const historySchema = z.object({
  workflowId: z.string().min(1),
  limit: z.number().int().positive().max(100).optional().default(50),
});

// Zod schema for WorkflowMetadata response
const workflowMetadataResponseSchema = z.object({
  id: z.number(),
  workflowId: z.string(),
  status: z.enum(["pending", "in-progress", "success", "failed", "canceled"]),
  overallProgress: z.number(),
  expectedPhaseCount: z.number(),
  completedPhaseCount: z.number(),
  activePhaseKey: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  failedAt: z.string().nullable(),
  canceledAt: z.string().nullable(),
  metadata: z.string(),
});

// Zod schema for WorkflowHistory response
const workflowHistoryResponseSchema = z.object({
  id: z.number(),
  workflowId: z.string(),
  eventType: z.string(),
  phaseKey: z.string().nullable(),
  message: z.string(),
  progress: z.number().nullable(),
  timestamp: z.string(),
  metadata: z.string().nullable(),
});

// Zod schema for EnrichedWorkflowResponse
const enrichedWorkflowResponseSchema = z.object({
  workflow: workflowMetadataResponseSchema,
  latestHistory: z.array(workflowHistoryResponseSchema),
});

/**
 * Workflows router - uses Workflow Durable Objects
 */
export const workflowsRouter = {
  /**
   * List all workflows from the registry (requires authentication)
   */
  listAll: protectedProcedure.handler(async ({ context }) => {
    const db = context.DB;
    if (!db) {
      throw new Error("Database not available");
    }

    // Import the schema dynamically
    const { workflowRegistry } = await import("@spectralNotify/db");
    const { drizzle } = await import("drizzle-orm/d1");
    const { desc } = await import("drizzle-orm");

    const database = drizzle(db as any);

    // Fetch all workflows from the registry
    const workflows = await database
      .select()
      .from(workflowRegistry)
      .orderBy(desc(workflowRegistry.createdAt));

    return {
      workflows: workflows.map((w) => ({
        workflowId: w.workflowId,
        createdAt: w.createdAt,
        createdBy: w.createdBy,
      })),
      count: workflows.length,
    };
  }),

  /**
   * Get all workflows with full metadata (public - for monitoring)
   */
  getAll: publicProcedure.handler(async ({ context }) => {
    const db = context.DB;
    const workflowBinding = context.WORKFLOW;

    if (!(db && workflowBinding)) {
      throw new Error("Database or WORKFLOW binding not available");
    }

    // Import the schema dynamically
    const { workflowRegistry } = await import("@spectralNotify/db");
    const { drizzle } = await import("drizzle-orm/d1");
    const { desc } = await import("drizzle-orm");

    const database = drizzle(db as any);

    // Fetch all workflow IDs from the registry
    const workflowIds = await database
      .select()
      .from(workflowRegistry)
      .orderBy(desc(workflowRegistry.createdAt));

    // Fetch metadata for each workflow from their DOs
    const workflowsWithMetadata = await Promise.all(
      workflowIds.map(async (registryEntry) => {
        try {
          // biome-ignore lint: Dynamic binding type
          const workflow = await handleGetWorkflow(
            workflowBinding as any,
            registryEntry.workflowId
          );
          // Get the latest event from history
          // biome-ignore lint: Dynamic binding type
          const history = await handleGetWorkflowHistory(
            workflowBinding as any,
            registryEntry.workflowId,
            1
          );

          // Get phases from relational table
          // biome-ignore lint: Dynamic binding type
          const phases = await handleGetWorkflowPhases(
            workflowBinding as any,
            registryEntry.workflowId
          );

          return {
            id: workflow.workflowId,
            status: workflow.status,
            overallProgress: workflow.overallProgress,
            phases,
            createdAt: new Date(workflow.createdAt),
            updatedAt: new Date(workflow.updatedAt),
            completedAt: workflow.completedAt
              ? new Date(workflow.completedAt)
              : undefined,
            failedAt: workflow.failedAt
              ? new Date(workflow.failedAt)
              : undefined,
            canceledAt: workflow.canceledAt
              ? new Date(workflow.canceledAt)
              : undefined,
            lastEvent: history[0]
              ? {
                  id: history[0].id.toString(),
                  timestamp: new Date(history[0].timestamp),
                  type: history[0].eventType as any,
                  phaseKey: history[0].phaseKey || undefined,
                  message: history[0].message,
                  progress: history[0].progress ?? undefined,
                }
              : {
                  id: "0",
                  timestamp: new Date(workflow.createdAt),
                  type: "log" as const,
                  message: "Workflow created",
                },
            events: [],
          };
        } catch (error) {
          console.error(
            `Failed to fetch workflow ${registryEntry.workflowId}:`,
            error
          );
          return null;
        }
      })
    );

    // Filter out any failed fetches
    const validWorkflows = workflowsWithMetadata.filter((w) => w !== null);

    return validWorkflows;
  }),

  /**
   * Create a new workflow (requires authentication or API key)
   */
  create: apiKeyProcedure
    .use(withIdempotency)
    .input(createWorkflowSchema)
    .output(
      withIdempotencySchema(
        z.object({
          success: z.boolean(),
          workflowId: z.string(),
        })
      )
    )
    .handler(async ({ input, context }) => {
      try {
        const workflowBinding = context.WORKFLOW;
        if (!workflowBinding) {
          throw new Error("WORKFLOW binding not available");
        }

        const db = context.DB;
        if (!db) {
          throw new Error("Database not available");
        }

        // Get user ID (from session or use "service" for API key auth)
        const userId = context.session?.user?.id || "service";

        // Initialize the workflow DO
        await handleInitializeWorkflow(
          // biome-ignore lint: Dynamic binding type
          workflowBinding as any,
          {
            workflowId: input.id,
            status: input.status,
            phases: input.phases,
            metadata: input.metadata,
          }
        );

        // Register the workflow in the database
        const { workflowRegistry } = await import("@spectralNotify/db");
        const { drizzle } = await import("drizzle-orm/d1");
        const { eq } = await import("drizzle-orm");
        const database = drizzle(db as any);

        // Check if workflow already exists (idempotent)
        const existingWorkflow = await database
          .select()
          .from(workflowRegistry)
          .where(eq(workflowRegistry.workflowId, input.id))
          .get();

        if (!existingWorkflow) {
          // Only insert if workflow doesn't exist
          await database.insert(workflowRegistry).values({
            workflowId: input.id,
            createdAt: new Date().toISOString(),
            createdBy: userId,
          });
        }

        return { success: true, workflowId: input.id };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to create workflow: ${errorMessage}`);
      }
    }),

  /**
   * Get workflow by ID (public - for monitoring)
   */
  getById: publicProcedure
    .input(workflowIdSchema)
    .handler(async ({ input, context }) => {
      try {
        const workflowBinding = context.WORKFLOW;
        if (!workflowBinding) {
          throw new Error("WORKFLOW binding not available");
        }

        // biome-ignore lint: Dynamic binding type
        const workflow = await handleGetWorkflow(
          workflowBinding as any,
          input.workflowId
        );
        return workflow;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to get workflow: ${errorMessage}`);
      }
    }),

  /**
   * Get workflow phases (public - for monitoring)
   */
  getPhases: publicProcedure
    .input(workflowIdSchema)
    .handler(async ({ input, context }) => {
      try {
        const workflowBinding = context.WORKFLOW;
        if (!workflowBinding) {
          throw new Error("WORKFLOW binding not available");
        }

        // biome-ignore lint: Dynamic binding type
        const phases = await handleGetWorkflowPhases(
          workflowBinding as any,
          input.workflowId
        );
        return phases;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to get workflow phases: ${errorMessage}`);
      }
    }),

  /**
   * Update phase progress (requires authentication or API key)
   */
  updatePhaseProgress: apiKeyProcedure
    .use(withIdempotency)
    .input(updatePhaseProgressSchema)
    .output(withIdempotencySchema(enrichedWorkflowResponseSchema))
    .handler(async ({ input, context }) => {
      try {
        const workflowBinding = context.WORKFLOW;
        if (!workflowBinding) {
          throw new Error("WORKFLOW binding not available");
        }

        const enrichedResponse = await handleUpdatePhaseProgress(
          // biome-ignore lint: Dynamic binding type
          workflowBinding as any,
          input.workflowId,
          input.phase,
          input.progress,
          input.metadata
        );

        return enrichedResponse;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to update phase progress: ${errorMessage}`);
      }
    }),

  /**
   * Mark phase as completed (requires authentication or API key)
   */
  completePhase: apiKeyProcedure
    .use(withIdempotency)
    .input(completePhaseSchema)
    .output(withIdempotencySchema(enrichedWorkflowResponseSchema))
    .handler(async ({ input, context }) => {
      try {
        const workflowBinding = context.WORKFLOW;
        if (!workflowBinding) {
          throw new Error("WORKFLOW binding not available");
        }

        const enrichedResponse = await handleCompletePhase(
          // biome-ignore lint: Dynamic binding type
          workflowBinding as any,
          input.workflowId,
          input.phase,
          input.metadata
        );

        return enrichedResponse;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to complete phase: ${errorMessage}`);
      }
    }),

  /**
   * Mark workflow as completed (requires authentication or API key)
   */
  complete: apiKeyProcedure
    .use(withIdempotency)
    .input(workflowMetadataSchema)
    .output(withIdempotencySchema(enrichedWorkflowResponseSchema))
    .handler(async ({ input, context }) => {
      try {
        const workflowBinding = context.WORKFLOW;
        if (!workflowBinding) {
          throw new Error("WORKFLOW binding not available");
        }

        const enrichedResponse = await handleCompleteWorkflow(
          // biome-ignore lint: Dynamic binding type
          workflowBinding as any,
          input.workflowId,
          input.metadata
        );

        return enrichedResponse;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to complete workflow: ${errorMessage}`);
      }
    }),

  /**
   * Mark workflow as failed (requires authentication or API key)
   */
  fail: apiKeyProcedure
    .use(withIdempotency)
    .input(failWorkflowSchema)
    .output(withIdempotencySchema(enrichedWorkflowResponseSchema))
    .handler(async ({ input, context }) => {
      try {
        const workflowBinding = context.WORKFLOW;
        if (!workflowBinding) {
          throw new Error("WORKFLOW binding not available");
        }

        const enrichedResponse = await handleFailWorkflow(
          // biome-ignore lint: Dynamic binding type
          workflowBinding as any,
          input.workflowId,
          input.error,
          input.metadata
        );

        return enrichedResponse;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to fail workflow: ${errorMessage}`);
      }
    }),

  /**
   * Mark workflow as canceled (requires authentication or API key)
   */
  cancel: apiKeyProcedure
    .use(withIdempotency)
    .input(workflowMetadataSchema)
    .output(withIdempotencySchema(enrichedWorkflowResponseSchema))
    .handler(async ({ input, context }) => {
      try {
        const workflowBinding = context.WORKFLOW;
        if (!workflowBinding) {
          throw new Error("WORKFLOW binding not available");
        }

        const enrichedResponse = await handleCancelWorkflow(
          // biome-ignore lint: Dynamic binding type
          workflowBinding as any,
          input.workflowId,
          input.metadata
        );

        return enrichedResponse;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to cancel workflow: ${errorMessage}`);
      }
    }),

  /**
   * Get workflow event history (public - for monitoring)
   */
  getHistory: publicProcedure
    .input(historySchema)
    .handler(async ({ input, context }) => {
      try {
        const workflowBinding = context.WORKFLOW;
        if (!workflowBinding) {
          throw new Error("WORKFLOW binding not available");
        }

        const history = await handleGetWorkflowHistory(
          // biome-ignore lint: Dynamic binding type
          workflowBinding as any,
          input.workflowId,
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
   * Delete workflow (requires authentication)
   */
  delete: protectedProcedure
    .input(workflowIdSchema)
    .handler(async ({ input, context }) => {
      try {
        const workflowBinding = context.WORKFLOW;
        if (!workflowBinding) {
          throw new Error("WORKFLOW binding not available");
        }

        const db = context.DB;
        if (!db) {
          throw new Error("Database not available");
        }

        // Delete the workflow DO storage first
        // biome-ignore lint: Dynamic binding type
        await handleDeleteWorkflow(workflowBinding as any, input.workflowId);

        // Remove from the registry
        const { workflowRegistry } = await import("@spectralNotify/db");
        const { drizzle } = await import("drizzle-orm/d1");
        const { eq } = await import("drizzle-orm");
        const database = drizzle(db as any);

        await database
          .delete(workflowRegistry)
          .where(eq(workflowRegistry.workflowId, input.workflowId));

        return { success: true, workflowId: input.workflowId };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to delete workflow: ${errorMessage}`);
      }
    }),

  /**
   * Delete all workflows (super admin only - requires authentication)
   */
  deleteAll: protectedProcedure.handler(async ({ context }) => {
    try {
      const workflowBinding = context.WORKFLOW;
      if (!workflowBinding) {
        throw new Error("WORKFLOW binding not available");
      }

      const db = context.DB;
      if (!db) {
        throw new Error("Database not available");
      }

      // Get all workflows from registry
      const { workflowRegistry } = await import("@spectralNotify/db");
      const { drizzle } = await import("drizzle-orm/d1");
      const database = drizzle(db as any);

      const allWorkflows = await database.select().from(workflowRegistry).all();

      // Delete all workflow DOs in parallel
      const deletePromises = allWorkflows.map((workflow) =>
        // biome-ignore lint: Dynamic binding type
        handleDeleteWorkflow(workflowBinding as any, workflow.workflowId).catch(
          (error) => ({
            workflowId: workflow.workflowId,
            error: error instanceof Error ? error.message : "Unknown error",
          })
        )
      );

      const results = await Promise.all(deletePromises);

      // Filter out failed deletions
      const failures = results.filter(
        (r): r is { workflowId: string; error: string } =>
          typeof r === "object" && "error" in r
      );

      // Delete all from registry (even if some DO deletions failed)
      await database.delete(workflowRegistry);

      return {
        success: true,
        deleted: allWorkflows.length,
        failures: failures.length > 0 ? failures : undefined,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to delete all workflows: ${errorMessage}`);
    }
  }),
};
