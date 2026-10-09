ALTER TABLE "seo_check_runs" ADD COLUMN "domain_id" uuid;--> statement-breakpoint
ALTER TABLE "seo_check_runs" ADD COLUMN "domain" text NOT NULL;--> statement-breakpoint
ALTER TABLE "seo_check_runs" ADD CONSTRAINT "seo_check_runs_domain_id_project_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."project_domains"("id") ON DELETE set null ON UPDATE no action;