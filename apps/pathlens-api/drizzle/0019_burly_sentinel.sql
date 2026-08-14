CREATE TABLE "project_snapshots" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"workspace_id" uuid NOT NULL,
	"source_domain" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"storage_path" text,
	"captured_at" timestamp with time zone,
	"requested_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"last_error" text,
	"failure_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_snapshots" ADD CONSTRAINT "project_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_snapshots" ADD CONSTRAINT "project_snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_snapshots_workspace_idx" ON "project_snapshots" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "project_snapshots_due_idx" ON "project_snapshots" USING btree ("status","next_attempt_at","captured_at");