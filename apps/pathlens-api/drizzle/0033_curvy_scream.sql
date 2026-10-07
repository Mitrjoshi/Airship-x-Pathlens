ALTER TABLE "audit_logs" ADD COLUMN "project_id" uuid;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "audit_logs" AS logs
SET "project_id" = (logs."metadata"->>'projectId')::uuid
WHERE logs."project_id" IS NULL
  AND logs."metadata"->>'projectId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM "projects"
    WHERE "projects"."id" = (logs."metadata"->>'projectId')::uuid
  );--> statement-breakpoint
UPDATE "audit_logs" AS logs
SET "project_id" = logs."resource_id"::uuid
WHERE logs."project_id" IS NULL
  AND logs."resource_type" = 'project'
  AND logs."resource_id" ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM "projects"
    WHERE "projects"."id" = logs."resource_id"::uuid
  );--> statement-breakpoint
CREATE INDEX "audit_logs_workspace_project_created_idx" ON "audit_logs" USING btree ("workspace_id","project_id","created_at");
