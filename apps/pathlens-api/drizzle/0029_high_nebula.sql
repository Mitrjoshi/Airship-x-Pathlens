CREATE TABLE "project_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key_prefix" text NOT NULL,
	"secret_hash" text NOT NULL,
	"scopes" jsonb DEFAULT '["events","replay","errors","performance"]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_api_keys_secret_hash_unique" UNIQUE("secret_hash")
);
--> statement-breakpoint
ALTER TABLE "project_api_keys" ADD CONSTRAINT "project_api_keys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_api_keys_project_idx" ON "project_api_keys" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_api_keys_secret_hash_idx" ON "project_api_keys" USING btree ("secret_hash");