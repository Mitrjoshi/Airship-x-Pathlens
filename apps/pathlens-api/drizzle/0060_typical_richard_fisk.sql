ALTER TABLE "integrations" ADD COLUMN "content" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "assets" jsonb DEFAULT '[]'::jsonb NOT NULL;