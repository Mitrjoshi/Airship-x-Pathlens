CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "sessions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "visitors" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "sessions" CASCADE;--> statement-breakpoint
DROP TABLE "visitors" CASCADE;--> statement-breakpoint
DROP INDEX "events_time_idx";--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "referrer" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "device" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "browser" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "browser_version" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "os" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "os_version" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "screen_width" bigint;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "screen_height" bigint;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "viewport_width" bigint;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "viewport_height" bigint;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "region" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "timezone" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "ip" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "user_agent" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "workspace_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "domain" text;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_path_idx" ON "events" USING btree ("path");--> statement-breakpoint
CREATE INDEX "events_occurred_idx" ON "events" USING btree ("occurred_at");--> statement-breakpoint
CREATE INDEX "events_browser_idx" ON "events" USING btree ("browser");--> statement-breakpoint
CREATE INDEX "events_device_idx" ON "events" USING btree ("device");--> statement-breakpoint
CREATE INDEX "events_country_idx" ON "events" USING btree ("country");--> statement-breakpoint
CREATE INDEX "projects_workspace_idx" ON "projects" USING btree ("workspace_id");