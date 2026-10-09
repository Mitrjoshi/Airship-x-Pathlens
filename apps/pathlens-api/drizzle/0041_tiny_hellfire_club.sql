ALTER TABLE "seo_crawled_pages" ADD COLUMN "audit" jsonb;--> statement-breakpoint
ALTER TABLE "seo_issues" ADD COLUMN "category" text DEFAULT 'technical' NOT NULL;--> statement-breakpoint
ALTER TABLE "seo_issues" ADD COLUMN "actual_value" text;--> statement-breakpoint
ALTER TABLE "seo_issues" ADD COLUMN "expected_value" text;--> statement-breakpoint
ALTER TABLE "seo_issues" ADD COLUMN "evidence" jsonb;