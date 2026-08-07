CREATE TABLE "permission_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "permission_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD COLUMN "permission_profile_id" uuid;--> statement-breakpoint
ALTER TABLE "permission_profiles" ADD CONSTRAINT "permission_profiles_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "permission_profiles_workspace_idx" ON "permission_profiles" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "permission_profiles_workspace_name_idx" ON "permission_profiles" USING btree ("workspace_id","name");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_permission_profile_id_permission_profiles_id_fk" FOREIGN KEY ("permission_profile_id") REFERENCES "public"."permission_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_permission_profile_id_permission_profiles_id_fk" FOREIGN KEY ("permission_profile_id") REFERENCES "public"."permission_profiles"("id") ON DELETE restrict ON UPDATE no action;