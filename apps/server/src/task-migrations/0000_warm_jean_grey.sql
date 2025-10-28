CREATE TABLE `task_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_type` text NOT NULL,
	`message` text NOT NULL,
	`progress` integer,
	`timestamp` text NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `task_metadata` (
	`id` integer PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`status` text NOT NULL,
	`progress` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`completed_at` text,
	`failed_at` text,
	`canceled_at` text,
	`metadata` text NOT NULL
);
