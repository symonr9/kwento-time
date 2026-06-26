ALTER TABLE `people` RENAME COLUMN "health_score" TO "connection_score";--> statement-breakpoint
CREATE TABLE `follow_up_expiry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`follow_up_id` integer NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`activated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`extended_at` integer,
	`archived_at` integer,
	FOREIGN KEY (`follow_up_id`) REFERENCES `follow_ups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `follow_up_expiry_follow_up_id_unique` ON `follow_up_expiry` (`follow_up_id`);--> statement-breakpoint
CREATE INDEX `follow_up_expiry_state_idx` ON `follow_up_expiry` (`state`);--> statement-breakpoint
CREATE INDEX `follow_up_expiry_expires_idx` ON `follow_up_expiry` (`expires_at`);--> statement-breakpoint
CREATE TABLE `my_life_item_expiry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`my_life_item_id` integer NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`activated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`extended_at` integer,
	`archived_at` integer,
	FOREIGN KEY (`my_life_item_id`) REFERENCES `my_life_items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `my_life_item_expiry_my_life_item_id_unique` ON `my_life_item_expiry` (`my_life_item_id`);--> statement-breakpoint
CREATE INDEX `my_life_item_expiry_state_idx` ON `my_life_item_expiry` (`state`);--> statement-breakpoint
CREATE INDEX `my_life_item_expiry_expires_idx` ON `my_life_item_expiry` (`expires_at`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_topics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer,
	`conversation_id` integer,
	`is_for_user` integer DEFAULT false NOT NULL,
	`content` text NOT NULL,
	`category` text,
	`importance` integer DEFAULT 1 NOT NULL,
	`tone` text DEFAULT 'light' NOT NULL,
	`last_mentioned_at` integer NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_topics`("id", "person_id", "conversation_id", "is_for_user", "content", "category", "importance", "tone", "last_mentioned_at", "resolved", "resolved_at", "created_at", "updated_at") SELECT "id", "person_id", "conversation_id", 0, "content", "category", 1, 'light', "updated_at", CASE WHEN "is_active" THEN 0 ELSE 1 END, NULL, "created_at", "updated_at" FROM `topics`;--> statement-breakpoint
DROP TABLE `topics`;--> statement-breakpoint
ALTER TABLE `__new_topics` RENAME TO `topics`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `topics_person_idx` ON `topics` (`person_id`);--> statement-breakpoint
CREATE INDEX `topics_resolved_idx` ON `topics` (`resolved`);--> statement-breakpoint
CREATE TABLE `__new_my_life_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`tone` text DEFAULT 'light' NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_my_life_items`("id", "content", "tone", "resolved", "resolved_at", "created_at", "updated_at") SELECT "id", "content", "tone", CASE WHEN "is_active" THEN 0 ELSE 1 END, NULL, "created_at", "updated_at" FROM `my_life_items`;--> statement-breakpoint
DROP TABLE `my_life_items`;--> statement-breakpoint
ALTER TABLE `__new_my_life_items` RENAME TO `my_life_items`;--> statement-breakpoint
CREATE INDEX `my_life_items_resolved_idx` ON `my_life_items` (`resolved`);--> statement-breakpoint
ALTER TABLE `conversations` DROP COLUMN `raw_transcript`;--> statement-breakpoint
ALTER TABLE `conversations` DROP COLUMN `audio_uri`;--> statement-breakpoint
ALTER TABLE `conversations` DROP COLUMN `source`;
