CREATE TABLE IF NOT EXISTS "heatmap_page_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "project_id" uuid NOT NULL,
  "domain" text NOT NULL,
  "page_path" text NOT NULL,
  "source_url" text NOT NULL,
  "device" text DEFAULT 'desktop' NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "storage_path" text,
  "viewport_width" integer DEFAULT 1280 NOT NULL,
  "viewport_height" integer DEFAULT 900 NOT NULL,
  "page_width" integer,
  "page_height" integer,
  "device_scale_factor" double precision DEFAULT 1 NOT NULL,
  "captured_at" timestamp with time zone,
  "requested_at" timestamp with time zone,
  "last_attempt_at" timestamp with time zone,
  "next_attempt_at" timestamp with time zone,
  "last_error" text,
  "failure_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "heatmap_page_snapshots"
  ADD CONSTRAINT "heatmap_page_snapshots_workspace_id_workspaces_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id")
  ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "heatmap_page_snapshots"
  ADD CONSTRAINT "heatmap_page_snapshots_project_id_projects_id_fk"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id")
  ON DELETE cascade;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS
  "heatmap_page_snapshots_project_page_device_idx"
  ON "heatmap_page_snapshots"
  USING btree ("project_id", "domain", "page_path", "device");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS
  "heatmap_page_snapshots_due_idx"
  ON "heatmap_page_snapshots"
  USING btree ("status", "next_attempt_at", "captured_at");