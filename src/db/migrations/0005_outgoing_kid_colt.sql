ALTER TABLE `follow_ups` ADD `category` text;--> statement-breakpoint
ALTER TABLE `follow_ups` ADD `importance` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `follow_ups` ADD `tone` text DEFAULT 'light' NOT NULL;