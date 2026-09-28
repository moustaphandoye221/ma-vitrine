CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`shop_id` text NOT NULL,
	`plan` text DEFAULT 'decouverte' NOT NULL,
	`billing_cycle` text DEFAULT 'none' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` text,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_shop_id_unique` ON `subscriptions` (`shop_id`);