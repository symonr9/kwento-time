ALTER TABLE `conversations` RENAME COLUMN "extraction_status" TO "structure_status";--> statement-breakpoint
DROP INDEX `conversations_extraction_status_idx`;--> statement-breakpoint
CREATE INDEX `conversations_structure_status_idx` ON `conversations` (`structure_status`);