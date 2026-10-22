CREATE TABLE "heatmap_preview_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle_hash" text NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"project_domain_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"canonical_hostname" text NOT NULL,
	"allowed_hostnames" jsonb NOT NULL,
	"pathname" text NOT NULL,
	"device" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	CONSTRAINT "heatmap_preview_sessions_handle_hash_unique" UNIQUE("handle_hash")
);
--> statement-breakpoint
ALTER TABLE "heatmap_preview_sessions" ADD CONSTRAINT "heatmap_preview_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heatmap_preview_sessions" ADD CONSTRAINT "heatmap_preview_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heatmap_preview_sessions" ADD CONSTRAINT "heatmap_preview_sessions_project_domain_id_project_domains_id_fk" FOREIGN KEY ("project_domain_id") REFERENCES "public"."project_domains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "heatmap_preview_sessions" ADD CONSTRAINT "heatmap_preview_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "heatmap_preview_sessions_project_idx" ON "heatmap_preview_sessions" USING btree ("project_id","project_domain_id");--> statement-breakpoint
CREATE INDEX "heatmap_preview_sessions_expiry_idx" ON "heatmap_preview_sessions" USING btree ("expires_at");