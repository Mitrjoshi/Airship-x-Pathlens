CREATE TABLE "replay_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" text NOT NULL,
	"sequence" integer NOT NULL,
	"events" jsonb NOT NULL,
	"first_timestamp" timestamp with time zone NOT NULL,
	"last_timestamp" timestamp with time zone NOT NULL,
	"byte_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "replay_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"screen_width" integer,
	"screen_height" integer,
	"viewport_width" integer,
	"viewport_height" integer,
	"url" text,
	"path" text,
	"last_sequence" integer DEFAULT -1 NOT NULL,
	"event_count" integer DEFAULT 0 NOT NULL,
	"byte_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "replay_chunks" ADD CONSTRAINT "replay_chunks_session_id_replay_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."replay_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_sessions" ADD CONSTRAINT "replay_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "replay_sessions" ADD CONSTRAINT "replay_sessions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "replay_chunks_session_sequence_idx" ON "replay_chunks" USING btree ("session_id","sequence");--> statement-breakpoint
CREATE INDEX "replay_chunks_session_timestamp_idx" ON "replay_chunks" USING btree ("session_id","first_timestamp");--> statement-breakpoint
CREATE INDEX "replay_sessions_project_idx" ON "replay_sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "replay_sessions_workspace_idx" ON "replay_sessions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "replay_sessions_visitor_idx" ON "replay_sessions" USING btree ("visitor_id");--> statement-breakpoint
CREATE INDEX "replay_sessions_last_seen_idx" ON "replay_sessions" USING btree ("last_seen_at");