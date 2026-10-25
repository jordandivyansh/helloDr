CREATE TABLE `invoices` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`child_id` text NOT NULL,
	`doctor_id` text NOT NULL,
	`appointment_id` text,
	`items` text NOT NULL,
	`discount_paise` integer NOT NULL,
	`total_paise` integer NOT NULL,
	`paid_paise` integer DEFAULT 0 NOT NULL,
	`payments` text DEFAULT '[]' NOT NULL,
	`status` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL,
	`memo` text DEFAULT '' NOT NULL,
	`void_reason` text,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "invoice_status" CHECK("invoices"."status" IN ('issued','paid','void')),
	CONSTRAINT "invoice_discount" CHECK("invoices"."discount_paise">=0),
	CONSTRAINT "invoice_total" CHECK("invoices"."total_paise">0),
	CONSTRAINT "invoice_paid" CHECK("invoices"."paid_paise">=0 AND "invoices"."paid_paise"<="invoices"."total_paise")
);
--> statement-breakpoint
CREATE INDEX `invoices_child` ON `invoices` (`tenant`,`child_id`);--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`child_id` text NOT NULL,
	`doctor_id` text NOT NULL,
	`appointment_id` text,
	`status` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`content` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	`published` text,
	`void_reason` text,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`appointment_id`) REFERENCES `appointments`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "prescription_status" CHECK("prescriptions"."status" IN ('draft','published','void'))
);
--> statement-breakpoint
CREATE INDEX `prescriptions_child` ON `prescriptions` (`tenant`,`child_id`);