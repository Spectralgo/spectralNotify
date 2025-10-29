CREATE TABLE `workflow_registry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`workflow_id` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workflow_registry_workflow_id_unique` ON `workflow_registry` (`workflow_id`);