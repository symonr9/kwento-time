CREATE TABLE `item_tags` (
	`item_type` text NOT NULL,
	`item_id` integer NOT NULL,
	`tag_id` integer NOT NULL,
	PRIMARY KEY(`item_type`, `item_id`, `tag_id`),
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `item_tags_tag_idx` ON `item_tags` (`tag_id`);--> statement-breakpoint
CREATE INDEX `item_tags_item_idx` ON `item_tags` (`item_type`,`item_id`);