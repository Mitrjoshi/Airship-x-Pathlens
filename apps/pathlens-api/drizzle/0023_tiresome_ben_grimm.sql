ALTER TABLE "projects" ADD COLUMN "capture_replay" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "capture_performance" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "capture_errors" boolean DEFAULT false NOT NULL;