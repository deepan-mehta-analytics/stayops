ALTER TABLE "reconciliation_flags" ADD COLUMN "accepted_by" text;--> statement-breakpoint
ALTER TABLE "reconciliation_flags" ADD COLUMN "accepted_at" timestamp;--> statement-breakpoint
ALTER TABLE "reconciliation_flags" ADD COLUMN "ai_confidence" integer;--> statement-breakpoint
ALTER TABLE "reconciliation_flags" ADD COLUMN "user_feedback" varchar(20);