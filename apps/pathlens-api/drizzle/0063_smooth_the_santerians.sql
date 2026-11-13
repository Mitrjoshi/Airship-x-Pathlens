CREATE TABLE "integration_notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"project_integration_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"report_type" text NOT NULL,
	"reporting_period_start" timestamp with time zone NOT NULL,
	"reporting_period_end" timestamp with time zone NOT NULL,
	"reporting_timezone" text NOT NULL,
	"channel_id" text NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"ready_at" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone,
	"locked_until" timestamp with time zone,
	"lock_token" uuid,
	"provider_message_id" text,
	"last_error_code" text,
	"last_error" text,
	"last_attempt_at" timestamp with time zone,
	"enqueued_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_notification_deliveries_status_check" CHECK ("integration_notification_deliveries"."status" IN ('scheduled', 'queued', 'processing', 'succeeded', 'retryable_failed', 'permanent_failed', 'cancelled')),
	CONSTRAINT "integration_notification_deliveries_report_type_check" CHECK ("integration_notification_deliveries"."report_type" IN ('daily', 'weekly')),
	CONSTRAINT "integration_notification_deliveries_provider_check" CHECK ("integration_notification_deliveries"."provider" = 'slack')
);
--> statement-breakpoint
ALTER TABLE "integration_notification_deliveries" ADD CONSTRAINT "integration_notification_deliveries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_notification_deliveries" ADD CONSTRAINT "integration_notification_deliveries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_notification_deliveries" ADD CONSTRAINT "integration_notification_deliveries_project_integration_id_project_integrations_id_fk" FOREIGN KEY ("project_integration_id") REFERENCES "public"."project_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "integration_notification_deliveries_unique_idx" ON "integration_notification_deliveries" USING btree ("provider","project_integration_id","report_type","reporting_period_start","reporting_period_end");--> statement-breakpoint
CREATE INDEX "integration_notification_deliveries_due_idx" ON "integration_notification_deliveries" USING btree ("status","ready_at","next_attempt_at","enqueued_at");--> statement-breakpoint
CREATE INDEX "integration_notification_deliveries_lease_idx" ON "integration_notification_deliveries" USING btree ("status","locked_until");--> statement-breakpoint
CREATE INDEX "integration_notification_deliveries_integration_idx" ON "integration_notification_deliveries" USING btree ("project_integration_id","report_type");