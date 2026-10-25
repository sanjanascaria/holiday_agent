CREATE TABLE `ai_usage` (
	`scope` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `capture_jobs` (
	`message` text PRIMARY KEY NOT NULL,
	`trip` text NOT NULL,
	`state` text NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`run` text DEFAULT '' NOT NULL,
	`result_ids` text DEFAULT '[]' NOT NULL,
	`created` integer NOT NULL,
	`updated` integer NOT NULL
);
