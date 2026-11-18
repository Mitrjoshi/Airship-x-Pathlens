CREATE TABLE "permission_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"requester_user_id" uuid NOT NULL,
	"requested_permission" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_member_permissions" (
	"workspace_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"permission" text NOT NULL,
	"granted_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_member_permissions_pk" PRIMARY KEY("workspace_id","user_id","permission")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "permission_request_id" uuid;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "payload" jsonb;--> statement-breakpoint
ALTER TABLE "permission_requests" ADD CONSTRAINT "permission_requests_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_requests" ADD CONSTRAINT "permission_requests_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "permission_requests" ADD CONSTRAINT "permission_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member_permissions" ADD CONSTRAINT "workspace_member_permissions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member_permissions" ADD CONSTRAINT "workspace_member_permissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_member_permissions" ADD CONSTRAINT "workspace_member_permissions_granted_by_user_id_users_id_fk" FOREIGN KEY ("granted_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "permission_requests_pending_idx" ON "permission_requests" USING btree ("workspace_id","requester_user_id","requested_permission") WHERE "permission_requests"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "permission_requests_workspace_created_idx" ON "permission_requests" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "workspace_member_permissions_user_idx" ON "workspace_member_permissions" USING btree ("workspace_id","user_id");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_permission_request_id_permission_requests_id_fk" FOREIGN KEY ("permission_request_id") REFERENCES "public"."permission_requests"("id") ON DELETE cascade ON UPDATE no action;
