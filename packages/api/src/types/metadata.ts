import { z } from "zod";

/**
 * Information about who authored or initiated a task/workflow
 */
export const authorInfoSchema = z.object({
	/**
	 * Type of author
	 * - user: Human user action
	 * - system: System-initiated (retries, cleanup, scheduled tasks)
	 * - service: External service or API call
	 */
	type: z.enum(["user", "system", "service"]).default("user"),

	/**
	 * Unique identifier for the author (user ID, service name, etc.)
	 */
	id: z.string().min(1),

	/**
	 * Human-readable name (optional)
	 */
	name: z.string().optional(),

	/**
	 * Email address (optional, for user authors)
	 */
	email: z.string().email().optional(),
});
export type AuthorInfo = z.infer<typeof authorInfoSchema>;

/**
 * Information about where the task/workflow originated from
 */
export const originInfoSchema = z.object({
	/**
	 * Repository where the task was initiated
	 */
	repo: z
		.enum(["spectralTranscript", "spectralNotify", "external"])
		.default("spectralTranscript"),

	/**
	 * Application layer that created the task
	 */
	app: z
		.enum(["web", "native", "server", "api", "cli"])
		.default("server"),

	/**
	 * Specific module or service that initiated the task (optional)
	 * Examples: 'NotifyBroker', 'YouTubeTranscriptionOrchestrationService'
	 */
	module: z.string().optional(),

	/**
	 * Source URL or reference (optional)
	 * Can be a task URL, video URL, file path, etc.
	 */
	source: z.string().url().optional(),
});
export type OriginInfo = z.infer<typeof originInfoSchema>;

/**
 * Information about the purpose or goal of the task/workflow
 */
export const purposeInfoSchema = z.object({
	/**
	 * Short, descriptive title (required)
	 * Max 140 characters for display in compact UI
	 */
	title: z.string().min(1).max(140),

	/**
	 * Longer description of what the task accomplishes (optional)
	 * Max 2000 characters
	 */
	description: z.string().max(2000).optional(),
});
export type PurposeInfo = z.infer<typeof purposeInfoSchema>;

/**
 * Complete metadata structure for notify tasks and workflows
 *
 * All fields are optional to maintain backwards compatibility.
 * Use .passthrough() to allow additional custom fields.
 */
export const notifyMetadataSchema = z
	.object({
		/**
		 * Author information (who created this task)
		 */
		author: authorInfoSchema.optional(),

		/**
		 * Origin information (where this task came from)
		 */
		origin: originInfoSchema.optional(),

		/**
		 * Purpose information (what this task accomplishes)
		 */
		purpose: purposeInfoSchema.optional(),

		/**
		 * Optional tags for categorization (max 12 tags)
		 */
		tags: z.array(z.string()).max(12).optional(),
	})
	.passthrough(); // Allow additional custom fields for flexibility

export type NotifyMetadata = z.infer<typeof notifyMetadataSchema>;

/**
 * Helper function to create default system author
 */
export const createSystemAuthor = (): AuthorInfo => ({
	type: "system",
	id: "system",
	name: "System",
});

/**
 * Helper function to create default origin for spectralTranscript
 */
export const createDefaultOrigin = (
	module?: string,
	source?: string,
): OriginInfo => ({
	repo: "spectralTranscript",
	app: "server",
	module,
	source,
});

/**
 * Helper function to safely parse metadata from JSON string
 * Returns undefined if parsing fails or metadata is invalid
 */
export const parseNotifyMetadata = (
	metadataJson: string | null | undefined,
): NotifyMetadata | undefined => {
	if (!metadataJson) {
		return undefined;
	}

	try {
		const parsed = JSON.parse(metadataJson);
		const result = notifyMetadataSchema.safeParse(parsed);
		return result.success ? result.data : undefined;
	} catch {
		return undefined;
	}
};
