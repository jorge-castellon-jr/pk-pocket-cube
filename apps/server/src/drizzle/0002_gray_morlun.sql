CREATE TABLE `draft_pool_editor` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_account_id` text NOT NULL,
	`display_name` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `draft_pool_editor_discord_account_id_unique` ON `draft_pool_editor` (`discord_account_id`);--> statement-breakpoint
CREATE TABLE `draft_pool_exclusion` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`scope` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `draft_pool_pick` (
	`id` text PRIMARY KEY NOT NULL,
	`card_id` text NOT NULL,
	`created_at` integer NOT NULL
);
