CREATE TABLE `workflow_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` text NOT NULL,
	`event_type` text NOT NULL,
	`phase_key` text,
	`message` text NOT NULL,
	`progress` integer,
	`timestamp` text NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `workflow_metadata` (
	`id` integer PRIMARY KEY NOT NULL,
	`workflow_id` text NOT NULL,
	`status` text NOT NULL,
	`overall_progress` integer DEFAULT 0 NOT NULL,
	`expected_phase_count` integer DEFAULT 0 NOT NULL,
	`completed_phase_count` integer DEFAULT 0 NOT NULL,
	`active_phase_key` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text,
	`failed_at` text,
	`canceled_at` text,
	`metadata` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workflow_phases` (
	`workflow_id` text NOT NULL,
	`phase_key` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`weight` real NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`order` integer NOT NULL,
	`started_at` text,
	`updated_at` text,
	`completed_at` text
);
