CREATE TABLE "project_seo_settings" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"sitemap_url" text,
	"max_pages" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_check_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"requested_by" uuid,
	"status" text DEFAULT 'queued' NOT NULL,
	"current_step" text DEFAULT 'queued' NOT NULL,
	"current_step_index" integer DEFAULT 0 NOT NULL,
	"total_steps" integer DEFAULT 9 NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"pages_discovered" integer DEFAULT 0 NOT NULL,
	"pages_crawled" integer DEFAULT 0 NOT NULL,
	"pages_total" integer DEFAULT 0 NOT NULL,
	"issues_found" integer DEFAULT 0 NOT NULL,
	"score" integer,
	"status_message" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_crawled_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"check_id" uuid NOT NULL,
	"url" text NOT NULL,
	"status_code" integer,
	"title" text,
	"meta_description" text,
	"canonical_url" text,
	"h1_count" integer DEFAULT 0 NOT NULL,
	"word_count" integer DEFAULT 0 NOT NULL,
	"load_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seo_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"check_id" uuid NOT NULL,
	"page_id" uuid,
	"code" text NOT NULL,
	"severity" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"recommendation" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_seo_settings" ADD CONSTRAINT "project_seo_settings_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_check_runs" ADD CONSTRAINT "seo_check_runs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_check_runs" ADD CONSTRAINT "seo_check_runs_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_crawled_pages" ADD CONSTRAINT "seo_crawled_pages_check_id_seo_check_runs_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."seo_check_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_check_id_seo_check_runs_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."seo_check_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seo_issues" ADD CONSTRAINT "seo_issues_page_id_seo_crawled_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."seo_crawled_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seo_check_runs_project_idx" ON "seo_check_runs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "seo_check_runs_status_idx" ON "seo_check_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "seo_crawled_pages_check_idx" ON "seo_crawled_pages" USING btree ("check_id");--> statement-breakpoint
CREATE INDEX "seo_crawled_pages_url_idx" ON "seo_crawled_pages" USING btree ("url");--> statement-breakpoint
CREATE INDEX "seo_issues_check_idx" ON "seo_issues" USING btree ("check_id");--> statement-breakpoint
CREATE INDEX "seo_issues_severity_idx" ON "seo_issues" USING btree ("severity");