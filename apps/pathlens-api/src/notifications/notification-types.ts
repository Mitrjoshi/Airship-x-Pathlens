import type { AnalyticsSummaryReportType } from "@workspace/contracts";

export type NotificationDeliveryStatus =
  | "scheduled"
  | "queued"
  | "processing"
  | "succeeded"
  | "retryable_failed"
  | "permanent_failed"
  | "cancelled";

export type NotificationDeliveryMessage = {
  deliveryId: string;
};

export type NotificationErrorCategory = "retryable" | "permanent" | "cancelled";

export type NotificationFailure = {
  category: NotificationErrorCategory;
  code: string;
  message: string;
  retryAfterSeconds?: number;
};

export type NotificationDeliveryRow = {
  id: string;
  workspace_id: string;
  project_id: string;
  project_integration_id: string;
  provider: "slack";
  report_type: AnalyticsSummaryReportType;
  reporting_period_start: Date;
  reporting_period_end: Date;
  reporting_timezone: string;
  channel_id: string;
  scheduled_for: Date;
  ready_at: Date;
  status: NotificationDeliveryStatus;
  attempts: number;
  next_attempt_at: Date | null;
  locked_until: Date | null;
  lock_token: string | null;
  provider_message_id: string | null;
  last_error_code: string | null;
  last_error: string | null;
  last_attempt_at: Date | null;
  enqueued_at: Date | null;
  created_at: Date;
  updated_at: Date;
};
