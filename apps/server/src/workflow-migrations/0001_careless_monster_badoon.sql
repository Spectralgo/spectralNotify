ALTER TABLE `workflow_phases` ADD `parent_phase_key` text;--> statement-breakpoint
ALTER TABLE `workflow_phases` ADD `depth` integer DEFAULT 0 NOT NULL;