ALTER TABLE `conversations` ADD `transcript_status` text DEFAULT 'confirmed' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `extraction_status` text DEFAULT 'not_needed' NOT NULL;--> statement-breakpoint
CREATE INDEX `conversations_transcript_status_idx` ON `conversations` (`transcript_status`);--> statement-breakpoint
CREATE INDEX `conversations_extraction_status_idx` ON `conversations` (`extraction_status`);