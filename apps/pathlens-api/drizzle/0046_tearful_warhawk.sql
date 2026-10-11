CREATE TABLE "heatmap_page_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"domain" text NOT NULL,
	"page_path" text NOT NULL,
	"source_url" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"storage_path" text,
	"viewport_width" integer DEFAULT 1280 NOT NULL,
	"viewport_height" integer DEFAULT 900 NOT NULL,
	"captured_at" timestamp with time zone,
	"requested_at" timestamp with time zone,
	"last_attempt_at" timestamp with time zone,
	"next_attempt_at" timestamp with time zone,
	"last_error" text,
	"failure_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "heatmap_page_snapshots" ADD CONSTRAINT "heatmap_page_snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heatmap_page_snapshots" ADD CONSTRAINT "heatmap_page_snapshots_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "heatmap_page_snapshots_project_source_url_idx" ON "heatmap_page_snapshots" USING btree ("project_id","source_url");--> statement-breakpoint
CREATE INDEX "heatmap_page_snapshots_due_idx" ON "heatmap_page_snapshots" USING btree ("status","next_attempt_at","captured_at");