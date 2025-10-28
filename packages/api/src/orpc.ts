import { os } from "@orpc/server";
import type { Context } from "./context";

/**
 * oRPC instance configured with our Context type
 *
 * This is the base builder for all procedures and middleware.
 * Separated into its own file to avoid circular dependencies.
 */
export const o = os.$context<Context>();
