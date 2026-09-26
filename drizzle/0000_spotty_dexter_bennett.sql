CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`folio` text NOT NULL,
	`created` text NOT NULL,
	`payload` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_quotes_owner_created` ON `quotes` (`owner`,`created`);--> statement-breakpoint
CREATE TABLE `workspace_state` (
	`owner` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL
);
