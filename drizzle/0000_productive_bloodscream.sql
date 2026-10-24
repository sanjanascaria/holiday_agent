CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`trip` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`status` text NOT NULL,
	`notes` text NOT NULL,
	`url` text NOT NULL,
	`source` text,
	`name` text NOT NULL,
	`review` integer DEFAULT 0 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created` integer NOT NULL,
	FOREIGN KEY (`trip`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `members` (
	`trip` text NOT NULL,
	`user` text NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`trip`, `user`),
	FOREIGN KEY (`trip`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`trip` text NOT NULL,
	`user` text NOT NULL,
	`name` text NOT NULL,
	`body` text NOT NULL,
	`reply` text,
	`created` integer NOT NULL,
	FOREIGN KEY (`trip`) REFERENCES `trips`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `revisions` (
	`id` text PRIMARY KEY NOT NULL,
	`trip` text NOT NULL,
	`item` text NOT NULL,
	`before` text NOT NULL,
	`after_version` integer NOT NULL,
	`name` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `trips` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`destination` text NOT NULL,
	`dates` text NOT NULL,
	`owner` text NOT NULL,
	`invite` text NOT NULL,
	`created` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trips_invite_unique` ON `trips` (`invite`);