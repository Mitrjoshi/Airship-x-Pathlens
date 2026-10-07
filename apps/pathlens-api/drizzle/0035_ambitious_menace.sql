ALTER TABLE "project_domains" ADD COLUMN "user_id" uuid;--> statement-breakpoint
UPDATE "project_domains" AS domains
SET "user_id" = workspaces."user_id"
FROM "projects"
INNER JOIN "workspaces" ON "workspaces"."id" = "projects"."workspace_id"
WHERE "projects"."id" = domains."project_id";--> statement-breakpoint
ALTER TABLE "project_domains" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "project_domains" ADD CONSTRAINT "project_domains_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_domains_user_idx" ON "project_domains" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "projects" DROP COLUMN "domain";
