CREATE TABLE "report_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid,
	"actor_user_id" uuid NOT NULL,
	"report_type" text NOT NULL,
	"filters" jsonb NOT NULL,
	"status" text DEFAULT 'generating' NOT NULL,
	"storage_path" text,
	"file_name" text,
	"mime_type" text,
	"file_size" integer,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "report_generations" ADD CONSTRAINT "report_generations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_generations" ADD CONSTRAINT "report_generations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_generations" ADD CONSTRAINT "report_generations_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_generations_workspace_created_idx" ON "report_generations" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "report_generations_workspace_project_created_idx" ON "report_generations" USING btree ("workspace_id","project_id","created_at");--> statement-breakpoint
CREATE INDEX "report_generations_status_idx" ON "report_generations" USING btree ("status");