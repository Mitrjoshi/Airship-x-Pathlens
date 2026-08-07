ALTER TABLE "notifications" DROP CONSTRAINT "notifications_permission_profile_id_permission_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_permission_profile_id_permission_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_permission_profile_id_permission_profiles_id_fk" FOREIGN KEY ("permission_profile_id") REFERENCES "public"."permission_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_permission_profile_id_permission_profiles_id_fk" FOREIGN KEY ("permission_profile_id") REFERENCES "public"."permission_profiles"("id") ON DELETE set null ON UPDATE no action;