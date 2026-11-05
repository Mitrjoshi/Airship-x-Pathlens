CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"icon_url" text,
	"status" text DEFAULT 'available' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integrations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "integrations_status_check" CHECK ("integrations"."status" IN ('available', 'coming_soon', 'disabled'))
);
--> statement-breakpoint
CREATE INDEX "integrations_visible_sort_idx" ON "integrations" USING btree ("is_visible","sort_order","name");