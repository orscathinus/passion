CREATE TABLE `exhibit_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`exhibit_no` text NOT NULL,
	`parent_id` text,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`status` text DEFAULT 'visible' NOT NULL,
	`ip_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `exhibit_comments_exhibit_idx` ON `exhibit_comments` (`exhibit_no`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `exhibit_comments_parent_idx` ON `exhibit_comments` (`parent_id`);--> statement-breakpoint
CREATE INDEX `exhibit_comments_ip_idx` ON `exhibit_comments` (`ip_hash`,`created_at`);