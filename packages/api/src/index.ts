import { ORPCError } from "@orpc/server";
import { o } from "./orpc";

export { o } from "./orpc";

export const publicProcedure = o;

const requireAuth = o.middleware(async ({ context, next }) => {
  // Require a real user session (not API key)
  if (!context.session?.user) {
    throw new ORPCError("UNAUTHORIZED");
  }
  // Pass through all context properties including env bindings
  return next({ context });
});

const requireApiKey = o.middleware(async ({ context, next }) => {
  // Require either a user session or valid API key
  if (!(context.session?.user || context.apiKeyAuthorized)) {
    throw new ORPCError("UNAUTHORIZED");
  }
  // Pass through all context properties including env bindings
  return next({ context });
});

export const protectedProcedure = publicProcedure.use(requireAuth);
export const apiKeyProcedure = publicProcedure.use(requireApiKey);

// Middleware
export { withIdempotency } from "./middleware/idempotency";

// Types
export type { IdempotencyMetadata, MutationResponse } from "./types/responses";
export type {
  NotifyMetadata,
  AuthorInfo,
  OriginInfo,
  PurposeInfo,
} from "./types/metadata";
export {
  notifyMetadataSchema,
  authorInfoSchema,
  originInfoSchema,
  purposeInfoSchema,
  createSystemAuthor,
  createDefaultOrigin,
  parseNotifyMetadata,
} from "./types/metadata";
