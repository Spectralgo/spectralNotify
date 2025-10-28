CREATE TABLE `counter_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operation` text NOT NULL,
	`previous_value` integer NOT NULL,
	`new_value` integer NOT NULL,
	`timestamp` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `counter_metadata` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`operation_count` integer DEFAULT 0 NOT NULL
);
