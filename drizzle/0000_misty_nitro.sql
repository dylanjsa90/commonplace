CREATE TABLE `bookmark_topics` (
	`bookmark_id` text NOT NULL,
	`topic_id` text NOT NULL,
	PRIMARY KEY(`bookmark_id`, `topic_id`),
	FOREIGN KEY (`bookmark_id`) REFERENCES `bookmarks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bookmarks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`domain` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`raw_text` text DEFAULT '' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`image` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`favorite` integer DEFAULT 0 NOT NULL,
	`saved_at` text NOT NULL,
	`fetched_at` text,
	`word_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookmarks_user_url` ON `bookmarks` (`user_id`,`url`);--> statement-breakpoint
CREATE INDEX `bookmarks_user_date` ON `bookmarks` (`user_id`,`saved_at`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `topics_user_name` ON `topics` (`user_id`,`name`);