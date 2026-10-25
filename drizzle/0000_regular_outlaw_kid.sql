CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`child_id` text,
	`parent_id` text,
	`day` text NOT NULL,
	`time` text NOT NULL,
	`type` text NOT NULL,
	`reason` text NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "appointment_status" CHECK("appointments"."status" IN ('scheduled','checked-in','completed','cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `one_booking_per_slot` ON `appointments` (`tenant`,`day`,`time`) WHERE "appointments"."status" != 'cancelled';--> statement-breakpoint
CREATE INDEX `appointments_parent` ON `appointments` (`tenant`,`parent_id`);--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`actor` text,
	`action` text NOT NULL,
	`resource` text,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `children` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`parent_id` text,
	`name` text NOT NULL,
	`dob` text NOT NULL,
	`sex` text NOT NULL,
	`allergies` text DEFAULT '' NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`parent_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `children_tenant_parent` ON `children` (`tenant`,`parent_id`);--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`child_id` text,
	`doctor_id` text,
	`body` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notes_child` ON `notes` (`tenant`,`child_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry` ON `sessions` (`expires`);--> statement-breakpoint
CREATE TABLE `slots` (
	`tenant` text NOT NULL,
	`day` text NOT NULL,
	`time` text NOT NULL,
	PRIMARY KEY(`tenant`, `day`, `time`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`role` text NOT NULL,
	CONSTRAINT "user_role" CHECK("users"."role" IN ('parent','doctor'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_tenant_email` ON `users` (`tenant`,`email`);--> statement-breakpoint
CREATE TABLE `vaccines` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`child_id` text,
	`name` text NOT NULL,
	`due` text NOT NULL,
	`administered` text,
	FOREIGN KEY (`child_id`) REFERENCES `children`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `vaccines_child` ON `vaccines` (`tenant`,`child_id`);