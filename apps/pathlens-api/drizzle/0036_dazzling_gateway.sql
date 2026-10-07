ALTER TABLE "project_domains" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "project_domains" AS domains
SET "is_default" = true
WHERE domains."id" IN (
  SELECT DISTINCT ON (project_id) id
  FROM "project_domains"
  ORDER BY project_id, created_at, id
);--> statement-breakpoint
CREATE UNIQUE INDEX "project_domains_project_default_idx" ON "project_domains" USING btree ("project_id") WHERE "project_domains"."is_default" = true;
