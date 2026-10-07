CREATE TABLE "project_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_domains" ADD CONSTRAINT "project_domains_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_domains_project_idx" ON "project_domains" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_domains_project_domain_idx" ON "project_domains" USING btree ("project_id","domain");
--> statement-breakpoint
INSERT INTO "project_domains" ("project_id", "domain")
SELECT
  "id",
  regexp_replace(
    regexp_replace(lower(trim("domain")), '^https?://', ''),
    '/.*$',
    ''
  )
FROM "projects"
WHERE "domain" IS NOT NULL
  AND trim("domain") <> ''
ON CONFLICT ("project_id", "domain") DO NOTHING;
