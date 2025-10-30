import { z } from "zod";

/**
 * Information about who authored or initiated a task/workflow
 */
export const authorInfoSchema = z.object({
  type: z.enum(["user", "system", "service"]).default("user"),
  id: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
});
export type AuthorInfo = z.infer<typeof authorInfoSchema>;

/**
 * Information about where the task/workflow originated from
 */
export const originInfoSchema = z.object({
  repo: z
    .enum(["spectralTranscript", "spectralNotify", "external"])
    .default("spectralTranscript"),
  app: z
    .enum(["web", "native", "server", "api", "cli"])
    .default("server"),
  module: z.string().optional(),
  source: z.string().url().optional(),
});
export type OriginInfo = z.infer<typeof originInfoSchema>;

/**
 * Information about the purpose or goal of the task/workflow
 */
export const purposeInfoSchema = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(2000).optional(),
});
export type PurposeInfo = z.infer<typeof purposeInfoSchema>;

/**
 * Complete metadata structure for notify tasks and workflows
 */
export const notifyMetadataSchema = z
  .object({
    author: authorInfoSchema.optional(),
    origin: originInfoSchema.optional(),
    purpose: purposeInfoSchema.optional(),
    tags: z.array(z.string()).max(12).optional(),
  })
  .passthrough();

export type NotifyMetadata = z.infer<typeof notifyMetadataSchema>;
