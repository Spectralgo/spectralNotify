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

// Mock database call to check if email is whitelisted
// In the future, this can be replaced with an actual database query
const checkEmailWhitelist = async (
  email: string,
  whitelist: string,
): Promise<boolean> => {
  // Simulate async database call
  await Promise.resolve();
  
  // If whitelist is empty or not set, allow all users
  if (!whitelist || whitelist.trim() === "") {
    return true;
  }
  
  // Parse comma-separated emails and check if email is in the list
  const allowedEmails = whitelist
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  
  return allowedEmails.includes(email.toLowerCase());
};

const requireWhitelist = o.middleware(async ({ context, next }) => {
  // This middleware should only run after requireAuth, so session.user should exist
  const userEmail = context.session?.user?.email;
  
  if (!userEmail) {
    throw new ORPCError("UNAUTHORIZED");
  }
  
  const whitelist = context.ALLOWED_EMAIL || "";
  const isAllowed = await checkEmailWhitelist(userEmail, whitelist);
  
  if (!isAllowed) {
    throw new ORPCError("FORBIDDEN", {
      message: "Your email is not authorized to access this resource",
    });
  }
  
  return next({ context });
});

export const protectedProcedure = publicProcedure.use(requireAuth).use(requireWhitelist);
export const apiKeyProcedure = publicProcedure.use(requireApiKey);

// Middleware
// Note: Server-only middleware (like idempotency) should be imported directly
// from their modules by server routers to avoid pulling server code into the
// browser bundle.

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
