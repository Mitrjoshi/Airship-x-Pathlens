DROP TABLE IF EXISTS "workspace_integrations" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "slack_oauth_states" CASCADE;--> statement-breakpoint
CREATE TABLE "project_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"integration_id" uuid NOT NULL,
	"provider_workspace_id" text NOT NULL,
	"provider_workspace_name" text NOT NULL,
	"encrypted_credentials" text NOT NULL,
	"credential_key_version" integer DEFAULT 1 NOT NULL,
	"provider_bot_user_id" text,
	"granted_scopes" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"status" text DEFAULT 'connected' NOT NULL,
	"connected_by_user_id" uuid NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	CONSTRAINT "project_integrations_status_check" CHECK ("project_integrations"."status" IN ('connected', 'disconnected', 'error'))
);
--> statement-breakpoint
CREATE TABLE "slack_oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"nonce_hash" text NOT NULL,
	"return_path" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "slack_oauth_states_nonce_hash_unique" UNIQUE("nonce_hash")
);
--> statement-breakpoint
ALTER TABLE "project_integrations" ADD CONSTRAINT "project_integrations_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_integrations" ADD CONSTRAINT "project_integrations_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_integrations" ADD CONSTRAINT "project_integrations_connected_by_user_id_users_id_fk" FOREIGN KEY ("connected_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_oauth_states" ADD CONSTRAINT "slack_oauth_states_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_oauth_states" ADD CONSTRAINT "slack_oauth_states_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "slack_oauth_states" ADD CONSTRAINT "slack_oauth_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_integrations_project_integration_idx" ON "project_integrations" USING btree ("project_id","integration_id");--> statement-breakpoint
CREATE INDEX "project_integrations_project_idx" ON "project_integrations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "slack_oauth_states_expiry_idx" ON "slack_oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "slack_oauth_states_workspace_idx" ON "slack_oauth_states" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "slack_oauth_states_project_idx" ON "slack_oauth_states" USING btree ("project_id");
