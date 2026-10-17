ALTER TABLE "goals" ADD COLUMN "domain_id" uuid;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_domain_id_project_domains_id_fk" FOREIGN KEY ("domain_id") REFERENCES "public"."project_domains"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_domain_idx" ON "goals" USING btree ("domain_id");