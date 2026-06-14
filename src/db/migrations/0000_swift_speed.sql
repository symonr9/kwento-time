CREATE TABLE `people` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`nickname` text,
	`how_we_met` text,
	`birthday` text,
	`avatar_uri` text,
	`notes` text,
	`health_score` integer DEFAULT 0 NOT NULL,
	`last_contacted_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `people_name_idx` ON `people` (`name`);--> statement-breakpoint
CREATE INDEX `people_last_contacted_idx` ON `people` (`last_contacted_at`);--> statement-breakpoint
CREATE TABLE `person_tags` (
	`person_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`person_id`, `tag_id`),
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `person_tags_tag_idx` ON `person_tags` (`tag_id`);--> statement-breakpoint
CREATE TABLE `tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tags_name_unique` ON `tags` (`name`);--> statement-breakpoint
CREATE INDEX `tags_name_idx` ON `tags` (`name`);--> statement-breakpoint
CREATE TABLE `person_places` (
	`person_id` integer NOT NULL,
	`place_id` integer NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`person_id`, `place_id`),
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `person_places_place_idx` ON `person_places` (`place_id`);--> statement-breakpoint
CREATE TABLE `places` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `places_name_idx` ON `places` (`name`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer,
	`raw_transcript` text NOT NULL,
	`summary` text,
	`audio_uri` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `conversations_person_idx` ON `conversations` (`person_id`);--> statement-breakpoint
CREATE INDEX `conversations_occurred_idx` ON `conversations` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `topic_expiry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`topic_id` integer NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`activated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`extended_at` integer,
	`archived_at` integer,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topic_expiry_topic_id_unique` ON `topic_expiry` (`topic_id`);--> statement-breakpoint
CREATE INDEX `topic_expiry_state_idx` ON `topic_expiry` (`state`);--> statement-breakpoint
CREATE INDEX `topic_expiry_expires_idx` ON `topic_expiry` (`expires_at`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer,
	`conversation_id` integer,
	`content` text NOT NULL,
	`category` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `topics_person_idx` ON `topics` (`person_id`);--> statement-breakpoint
CREATE INDEX `topics_active_idx` ON `topics` (`is_active`);--> statement-breakpoint
CREATE TABLE `follow_ups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer,
	`conversation_id` integer,
	`question` text NOT NULL,
	`resolved` integer DEFAULT false NOT NULL,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `follow_ups_person_idx` ON `follow_ups` (`person_id`);--> statement-breakpoint
CREATE INDEX `follow_ups_resolved_idx` ON `follow_ups` (`resolved`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`person_id` integer,
	`type` text NOT NULL,
	`related_id` integer,
	`scheduled_at` integer NOT NULL,
	`sent` integer DEFAULT false NOT NULL,
	`notification_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reminders_scheduled_idx` ON `reminders` (`scheduled_at`);--> statement-breakpoint
CREATE INDEX `reminders_sent_idx` ON `reminders` (`sent`);--> statement-breakpoint
CREATE TABLE `my_life_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`content` text NOT NULL,
	`tone` text DEFAULT 'light' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `my_life_items_active_idx` ON `my_life_items` (`is_active`);