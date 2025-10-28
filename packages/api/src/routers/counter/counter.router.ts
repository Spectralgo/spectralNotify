import z from "zod";
import { protectedProcedure } from "../../index";
import {
  handleDecrementCounter,
  handleDeleteCounter,
  handleGetCounterHistory,
  handleGetCounterMetadata,
  handleGetCounterValue,
  handleIncrementCounter,
  handleInitializeCounter,
  handleResetCounter,
  handleSetCounterValue,
} from "./counter.handlers";

// Define counter-specific errors
const counterErrors = protectedProcedure.errors({
  COUNTER_NOT_FOUND: {
    message: "The requested counter does not exist",
    data: z.object({ name: z.string() }),
  },
  COUNTER_VALIDATION_ERROR: {
    message: "Counter validation failed",
    data: z.object({ field: z.string(), reason: z.string() }),
  },
  COUNTER_OPERATION_FAILED: {
    message: "Counter operation failed",
    data: z.object({ operation: z.string(), reason: z.string() }),
  },
});

// Zod validation schemas
const counterNameSchema = z.object({
  name: z
    .string()
    .min(1, "Counter name is required")
    .max(100, "Counter name must be less than 100 characters")
    .regex(
      /^[\w-]+$/,
      "Counter name can only contain letters, numbers, hyphens, and underscores"
    ),
});

const incrementDecrementSchema = z.object({
  name: z
    .string()
    .min(1, "Counter name is required")
    .max(100, "Counter name must be less than 100 characters"),
  amount: z.number().int().positive().optional().default(1),
});

const setValueSchema = z.object({
  name: z
    .string()
    .min(1, "Counter name is required")
    .max(100, "Counter name must be less than 100 characters"),
  value: z.number().int(),
});

const historySchema = z.object({
  name: z
    .string()
    .min(1, "Counter name is required")
    .max(100, "Counter name must be less than 100 characters"),
  limit: z.number().int().positive().max(100).optional().default(50),
});

/**
 * Counter router - all endpoints require authentication
 */
export const counterRouter = {
  /**
   * List all counters from the registry
   */
  listAll: protectedProcedure.handler(async ({ context }) => {
    const db = context.DB;
    if (!db) {
      throw new Error("Database not available");
    }

    // Import the schema dynamically
    const { counterRegistry } = await import("@spectralNotify/db");
    const { drizzle } = await import("drizzle-orm/d1");
    const { desc } = await import("drizzle-orm");

    const database = drizzle(db as any);

    // Fetch all counters from the registry
    const counters = await database
      .select()
      .from(counterRegistry)
      .orderBy(desc(counterRegistry.createdAt));

    return {
      counters: counters.map((c) => ({
        name: c.name,
        createdAt: c.createdAt,
        createdBy: c.createdBy,
      })),
      count: counters.length,
    };
  }),

  /**
   * Initialize a new counter
   */
  create: counterErrors
    .input(counterNameSchema)
    .handler(async ({ input, context }) => {
      try {
        const counterBinding = context.COUNTER;
        if (!counterBinding) {
          throw new Error("COUNTER binding not available");
        }

        const db = context.DB;
        if (!db) {
          throw new Error("Database not available");
        }

        const userId = context.session?.user?.id;
        if (!userId) {
          throw new Error("User not authenticated");
        }

        // Initialize the counter DO
        await handleInitializeCounter(
          // biome-ignore lint: Dynamic binding type
          counterBinding as any,
          input.name
        );

        // Register the counter in the database
        const { counterRegistry } = await import("@spectralNotify/db");
        const { drizzle } = await import("drizzle-orm/d1");
        const database = drizzle(db as any);

        await database.insert(counterRegistry).values({
          name: input.name,
          createdAt: new Date().toISOString(),
          createdBy: userId,
        });

        return { success: true, name: input.name };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        throw new Error(`Failed to create counter: ${errorMessage}`);
      }
    }),

  /**
   * Get counter value by name
   */
  getValue: counterErrors
    .input(counterNameSchema)
    .handler(async ({ input, context, errors }) => {
      try {
        const counterBinding = context.COUNTER;
        if (!counterBinding) {
          throw new Error("COUNTER binding not available");
        }

        // biome-ignore lint: Dynamic binding type
        const value = await handleGetCounterValue(
          counterBinding as any,
          input.name
        );
        return { name: input.name, value };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("not initialized")) {
          throw errors.COUNTER_NOT_FOUND({ data: { name: input.name } });
        }

        throw errors.COUNTER_OPERATION_FAILED({
          data: { operation: "getValue", reason: errorMessage },
        });
      }
    }),

  /**
   * Get counter metadata
   */
  getMetadata: counterErrors
    .input(counterNameSchema)
    .handler(async ({ input, context, errors }) => {
      try {
        const counterBinding = context.COUNTER;
        if (!counterBinding) {
          throw new Error("COUNTER binding not available");
        }

        // biome-ignore lint: Dynamic binding type
        const metadata = await handleGetCounterMetadata(
          counterBinding as any,
          input.name
        );
        return metadata;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("not initialized")) {
          throw errors.COUNTER_NOT_FOUND({ data: { name: input.name } });
        }

        throw errors.COUNTER_OPERATION_FAILED({
          data: { operation: "getMetadata", reason: errorMessage },
        });
      }
    }),

  /**
   * Increment counter
   * Returns enriched response with metadata and recent history
   */
  increment: counterErrors
    .input(incrementDecrementSchema)
    .handler(async ({ input, context, errors }) => {
      try {
        const counterBinding = context.COUNTER;
        if (!counterBinding) {
          throw new Error("COUNTER binding not available");
        }

        const enrichedResponse = await handleIncrementCounter(
          // biome-ignore lint: Dynamic binding type
          counterBinding as any,
          input.name,
          input.amount
        );

        return {
          name: input.name,
          ...enrichedResponse,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("not initialized")) {
          throw errors.COUNTER_NOT_FOUND({ data: { name: input.name } });
        }

        throw errors.COUNTER_OPERATION_FAILED({
          data: { operation: "increment", reason: errorMessage },
        });
      }
    }),

  /**
   * Decrement counter
   * Returns enriched response with metadata and recent history
   */
  decrement: counterErrors
    .input(incrementDecrementSchema)
    .handler(async ({ input, context, errors }) => {
      try {
        const counterBinding = context.COUNTER;
        if (!counterBinding) {
          throw new Error("COUNTER binding not available");
        }

        const enrichedResponse = await handleDecrementCounter(
          // biome-ignore lint: Dynamic binding type
          counterBinding as any,
          input.name,
          input.amount
        );

        return {
          name: input.name,
          ...enrichedResponse,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("not initialized")) {
          throw errors.COUNTER_NOT_FOUND({ data: { name: input.name } });
        }

        throw errors.COUNTER_OPERATION_FAILED({
          data: { operation: "decrement", reason: errorMessage },
        });
      }
    }),

  /**
   * Set counter to specific value
   * Returns enriched response with metadata and recent history
   */
  setValue: counterErrors
    .input(setValueSchema)
    .handler(async ({ input, context, errors }) => {
      try {
        const counterBinding = context.COUNTER;
        if (!counterBinding) {
          throw new Error("COUNTER binding not available");
        }

        const enrichedResponse = await handleSetCounterValue(
          // biome-ignore lint: Dynamic binding type
          counterBinding as any,
          input.name,
          input.value
        );

        return {
          name: input.name,
          ...enrichedResponse,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("not initialized")) {
          throw errors.COUNTER_NOT_FOUND({ data: { name: input.name } });
        }

        throw errors.COUNTER_OPERATION_FAILED({
          data: { operation: "setValue", reason: errorMessage },
        });
      }
    }),

  /**
   * Reset counter to zero
   * Returns enriched response with metadata and recent history
   */
  reset: counterErrors
    .input(counterNameSchema)
    .handler(async ({ input, context, errors }) => {
      try {
        const counterBinding = context.COUNTER;
        if (!counterBinding) {
          throw new Error("COUNTER binding not available");
        }

        const enrichedResponse = await handleResetCounter(
          // biome-ignore lint: Dynamic binding type
          counterBinding as any,
          input.name
        );

        return {
          name: input.name,
          ...enrichedResponse,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("not initialized")) {
          throw errors.COUNTER_NOT_FOUND({ data: { name: input.name } });
        }

        throw errors.COUNTER_OPERATION_FAILED({
          data: { operation: "reset", reason: errorMessage },
        });
      }
    }),

  /**
   * Get counter operation history
   */
  getHistory: counterErrors
    .input(historySchema)
    .handler(async ({ input, context, errors }) => {
      try {
        const counterBinding = context.COUNTER;
        if (!counterBinding) {
          throw new Error("COUNTER binding not available");
        }

        const history = await handleGetCounterHistory(
          // biome-ignore lint: Dynamic binding type
          counterBinding as any,
          input.name,
          input.limit
        );
        return history;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("not initialized")) {
          throw errors.COUNTER_NOT_FOUND({ data: { name: input.name } });
        }

        throw errors.COUNTER_OPERATION_FAILED({
          data: { operation: "getHistory", reason: errorMessage },
        });
      }
    }),

  /**
   * Delete counter
   */
  delete: counterErrors
    .input(counterNameSchema)
    .handler(async ({ input, context, errors }) => {
      try {
        const counterBinding = context.COUNTER;
        if (!counterBinding) {
          throw new Error("COUNTER binding not available");
        }

        const db = context.DB;
        if (!db) {
          throw new Error("Database not available");
        }

        // Delete the counter DO
        // biome-ignore lint: Dynamic binding type
        await handleDeleteCounter(counterBinding as any, input.name);

        // Remove from the registry
        const { counterRegistry } = await import("@spectralNotify/db");
        const { drizzle } = await import("drizzle-orm/d1");
        const { eq } = await import("drizzle-orm");
        const database = drizzle(db as any);

        await database
          .delete(counterRegistry)
          .where(eq(counterRegistry.name, input.name));

        return { success: true, name: input.name };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage.includes("not initialized")) {
          throw errors.COUNTER_NOT_FOUND({ data: { name: input.name } });
        }

        throw errors.COUNTER_OPERATION_FAILED({
          data: { operation: "delete", reason: errorMessage },
        });
      }
    }),
};
