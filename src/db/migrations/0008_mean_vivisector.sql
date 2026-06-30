ALTER TABLE `people` ADD `native_contact_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `people_native_contact_id_idx` ON `people` (`native_contact_id`);