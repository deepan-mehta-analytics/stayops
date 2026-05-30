CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"channel_id" uuid,
	"channel_name" varchar(50),
	"guest_name" varchar(100) NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"gross" numeric(10, 2),
	"fees" numeric(10, 2),
	"nightly_rate" numeric(10, 2),
	"status" varchar(20) DEFAULT 'confirmed',
	"source_row_hash" varchar(64),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_source_row_hash_unique" UNIQUE("source_row_hash")
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"property_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(50),
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"contact" varchar(200),
	"message" text,
	"posthog_session" varchar(200),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"address" text,
	"base_rate" numeric(10, 2) NOT NULL,
	"capacity" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reconciliation_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"type" varchar(30) NOT NULL,
	"status" varchar(20) DEFAULT 'open',
	"reason" text,
	"ai_reasoning" text,
	"resolution" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"period" varchar(50) NOT NULL,
	"summary_md" text,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"delivered_to" varchar(200)
);
--> statement-breakpoint
CREATE TABLE "turnover_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"due_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"generated_from_booking_id" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_channel_id_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."channels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "channels" ADD CONSTRAINT "channels_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turnover_tasks" ADD CONSTRAINT "turnover_tasks_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "turnover_tasks" ADD CONSTRAINT "turnover_tasks_generated_from_booking_id_bookings_id_fk" FOREIGN KEY ("generated_from_booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;