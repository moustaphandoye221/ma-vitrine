PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_orders` (
 `id` text PRIMARY KEY NOT NULL,
 `shop_id` text NOT NULL,
 `customer_name` text NOT NULL,
 `customer_email` text NOT NULL,
 `customer_phone` text NOT NULL,
 `delivery_address` text NOT NULL,
 `items_json` text NOT NULL,
 `total` integer NOT NULL,
 `currency` text NOT NULL,
 `status` text DEFAULT 'nouvelle' NOT NULL,
 `payment_status` text DEFAULT 'non payé' NOT NULL,
 `created_at` text NOT NULL,
 FOREIGN KEY (`shop_id`) REFERENCES `shops`(`id`) ON UPDATE no action ON DELETE no action
);--> statement-breakpoint
INSERT INTO `__new_orders`("id", "shop_id", "customer_name", "customer_email", "customer_phone", "delivery_address", "items_json", "total", "currency", "status", "payment_status", "created_at") SELECT "id", "shop_id", "customer_name", "customer_email", "customer_phone", "delivery_address", "items_json", "total", "currency", "status", 'non payé', "created_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `shops` ADD `payment_instructions` text DEFAULT 'Paiement à la livraison' NOT NULL;
