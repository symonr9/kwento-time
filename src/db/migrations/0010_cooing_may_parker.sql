CREATE TABLE `icebreakers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`tone` text DEFAULT 'light' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `icebreakers_tone_idx` ON `icebreakers` (`tone`);--> statement-breakpoint
CREATE INDEX `icebreakers_created_at_idx` ON `icebreakers` (`created_at`);