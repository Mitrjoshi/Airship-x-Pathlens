CREATE TABLE "heatmap_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"path" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"storage_path" text,
	"image_width" integer,
	"image_height" integer,
	"error" text,
	"claimed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "heatmap_jobs" ADD CONSTRAINT "heatmap_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heatmap_jobs" ADD CONSTRAINT "heatmap_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "heatmap_jobs_project_path_idx" ON "heatmap_jobs" USING btree ("project_id","path");--> statement-breakpoint
CREATE INDEX "heatmap_jobs_status_idx" ON "heatmap_jobs" USING btree ("status");