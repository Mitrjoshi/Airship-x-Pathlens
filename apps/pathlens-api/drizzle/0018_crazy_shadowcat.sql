CREATE TABLE "visitor_campaign_attribution" (
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"utm_source" text,
	"utm_medium" text,
	"utm_campaign" text,
	"utm_term" text,
	"utm_content" text,
	"landing_url" text,
	"first_seen_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visitor_campaign_attribution_pk" PRIMARY KEY("workspace_id","project_id","visitor_id")
);
--> statement-breakpoint
ALTER TABLE "visitor_campaign_attribution" ADD CONSTRAINT "visitor_campaign_attribution_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visitor_campaign_attribution" ADD CONSTRAINT "visitor_campaign_attribution_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visitor_campaign_attribution_project_idx" ON "visitor_campaign_attribution" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "visitor_campaign_attribution_campaign_idx" ON "visitor_campaign_attribution" USING btree ("project_id","utm_campaign");--> statement-breakpoint
CREATE INDEX "visitor_campaign_attribution_first_seen_idx" ON "visitor_campaign_attribution" USING btree ("first_seen_at");