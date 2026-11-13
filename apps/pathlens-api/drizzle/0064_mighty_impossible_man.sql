CREATE TABLE "stripe_oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"nonce_hash" text NOT NULL,
	"return_path" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_oauth_states_nonce_hash_unique" UNIQUE("nonce_hash")
);
--> statement-breakpoint
ALTER TABLE "stripe_oauth_states" ADD CONSTRAINT "stripe_oauth_states_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_oauth_states" ADD CONSTRAINT "stripe_oauth_states_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_oauth_states" ADD CONSTRAINT "stripe_oauth_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stripe_oauth_states_expiry_idx" ON "stripe_oauth_states" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "stripe_oauth_states_workspace_idx" ON "stripe_oauth_states" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "stripe_oauth_states_project_idx" ON "stripe_oauth_states" USING btree ("project_id");