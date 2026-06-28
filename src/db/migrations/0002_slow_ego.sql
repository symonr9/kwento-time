ALTER TABLE `conversations` ADD `place_id` integer REFERENCES places(id);--> statement-breakpoint
ALTER TABLE `conversations` ADD `raw_transcript` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `audio_uri` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `source` text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
CREATE INDEX `conversations_place_idx` ON `conversations` (`place_id`);