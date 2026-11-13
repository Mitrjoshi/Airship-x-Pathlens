import { postSlackMessage, SlackApiError } from "../lib/slack-api";
import { decryptIntegrationCredentials } from "../lib/credential-encryption";
import { getAnalyticsSummaryModel } from "../models/analytics-summary.model";
import {
  claimNotificationDelivery,
  beginNotificationProviderSend,
  getNotificationDeliveryContext,
  isDeliveryForIntegration,
  markSlackIntegrationInvalid,
  updateNotificationFailure,
  updateNotificationSuccess,
} from "./notification-delivery";
import { parseNotificationSettings } from "./notification-settings";
import { getComparisonPeriod, getExpectedScheduledFor } from "./scheduling";
import type {
  NotificationDeliveryMessage,
  NotificationFailure,
} from "./notification-types";
import { logNotification } from "./notification-logging";
import { formatSlackAnalyticsReport } from "./slack-report-formatter";
import { getNotificationSmokeIntegrationId } from "./notification-isolation";
import {
  sendNotificationOnce,
  UNKNOWN_PROVIDER_CODE,
} from "./notification-send-safety";

const MAX_ATTEMPTS = 8;

class NotificationPermanentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly category: "permanent" | "cancelled" = "permanent"
  ) {
    super(message);
  }
}

function parseMessage(body: string): NotificationDeliveryMessage {
  const value = JSON.parse(body) as Partial<NotificationDeliveryMessage>;
  if (typeof value.deliveryId !== "string" || !value.deliveryId) {
    throw new NotificationPermanentError(
      "invalid_message",
      "Invalid delivery message."
    );
  }
  return { deliveryId: value.deliveryId };
}

export function classifyNotificationError(error: unknown): NotificationFailure {
  if (error instanceof NotificationPermanentError) {
    return {
      category: error.category,
      code: error.code,
      message: error.message,
    };
  }
  if (error instanceof SlackApiError) {
    if (error.code === "ratelimited") {
      return {
        category: "retryable",
        code: error.code,
        message: "Slack rate limit",
        retryAfterSeconds: error.retryAfterSeconds,
      };
    }
    if (
      [
        "invalid_auth",
        "token_revoked",
        "missing_scope",
        "channel_not_found",
        "is_archived",
        "not_in_channel",
        "method_not_supported_for_channel_type",
        "no_permission",
      ].includes(error.code)
    ) {
      return {
        category: "permanent",
        code: error.code,
        message: "Slack rejected the configured integration or channel.",
      };
    }
    return {
      category: "retryable",
      code: error.code,
      message: "Temporary Slack delivery failure.",
    };
  }
  return {
    category: "retryable",
    code: "temporary_failure",
    message: "Temporary notification failure.",
  };
}

export function getNotificationRetryAt(
  attempt: number,
  retryAfterSeconds?: number,
  now = Date.now()
) {
  const backoffSeconds = Math.min(
    24 * 60 * 60,
    60 * 2 ** Math.max(0, attempt - 1)
  );
  const delaySeconds = Math.max(backoffSeconds, retryAfterSeconds ?? 0) + 3;
  return new Date(now + delaySeconds * 1000);
}

export async function processNotificationDelivery(deliveryId: string) {
  const smokeIntegrationId = getNotificationSmokeIntegrationId();
  if (smokeIntegrationId) {
    if (process.env.PATHLENS_NOTIFICATION_MOCK_SLACK !== "true")
      throw new Error("Smoke mode requires mocked Slack transport.");
    if (!(await isDeliveryForIntegration(deliveryId, smokeIntegrationId)))
      throw new Error("Delivery is outside smoke-test scope.");
  }
  const claimed = await claimNotificationDelivery(deliveryId);
  if (!claimed) return;
  let context;
  try {
    context = await getNotificationDeliveryContext(deliveryId);
  } catch (error) {
    const retryable = claimed.attempts < MAX_ATTEMPTS;
    await updateNotificationFailure({
      deliveryId,
      lockToken: claimed.lockToken!,
      status: retryable ? "retryable_failed" : "permanent_failed",
      code: "context_load_failed",
      message: "Unable to load notification delivery context.",
      nextAttemptAt: retryable
        ? getNotificationRetryAt(claimed.attempts)
        : null,
    });
    throw error;
  }
  if (!context) {
    await updateNotificationFailure({
      deliveryId,
      lockToken: claimed.lockToken!,
      status: "permanent_failed",
      code: "delivery_not_found",
      message: "Delivery context not found.",
    });
    throw new NotificationPermanentError(
      "delivery_not_found",
      "Delivery context not found."
    );
  }

  const fields = {
    deliveryId,
    workspaceId: context.workspace_id,
    projectId: context.project_id,
    integrationId: context.project_integration_id,
    reportType: context.report_type,
    attempt: context.attempts,
  };
  let providerRejectionProven = false;

  try {
    if (context.usage_status !== "active") {
      throw new NotificationPermanentError(
        "workspace_inactive",
        "Workspace notifications are paused.",
        "cancelled"
      );
    }
    if (context.integration_status !== "connected") {
      throw new NotificationPermanentError(
        "integration_disconnected",
        "Slack is disconnected.",
        "cancelled"
      );
    }
    const settings = parseNotificationSettings(
      context.settings,
      context.notification_preferences
    );
    if (!settings) {
      throw new NotificationPermanentError(
        "invalid_slack_settings",
        "Slack settings are incomplete.",
        "cancelled"
      );
    }
    if (context.report_type === "weekly" && !settings.weeklyDayConfirmed) {
      throw new NotificationPermanentError(
        "weekly_day_unconfirmed",
        "Weekly weekday confirmation is required.",
        "cancelled"
      );
    }
    if (
      context.report_type === "daily"
        ? !settings.dailyEnabled
        : !settings.weeklyEnabled
    ) {
      throw new NotificationPermanentError(
        "notifications_disabled",
        "This notification type is disabled.",
        "cancelled"
      );
    }
    if (
      settings.channelId !== context.channel_id ||
      settings.timezone !== context.reporting_timezone
    ) {
      throw new NotificationPermanentError(
        "configuration_changed",
        "Slack scheduling configuration changed.",
        "cancelled"
      );
    }
    const expectedScheduledFor = getExpectedScheduledFor(
      context.report_type,
      {
        timezone: context.reporting_timezone,
        start: new Date(context.reporting_period_start),
        end: new Date(context.reporting_period_end),
        previousStart: new Date(context.reporting_period_start),
        previousEnd: new Date(context.reporting_period_start),
      },
      settings
    );
    if (
      !expectedScheduledFor ||
      expectedScheduledFor.getTime() !==
        new Date(context.scheduled_for).getTime()
    ) {
      // A delivery created with an older schedule is cancelled rather than
      // replaced. The reporting-period uniqueness constraint prevents a
      // preference edit from creating a duplicate for the same period.
      throw new NotificationPermanentError(
        "configuration_changed",
        "Slack scheduling configuration changed.",
        "cancelled"
      );
    }

    const period = getComparisonPeriod(
      context.report_type,
      {
        timezone: context.reporting_timezone,
        start: new Date(context.reporting_period_start),
        end: new Date(context.reporting_period_end),
        previousStart: new Date(context.reporting_period_start),
        previousEnd: new Date(context.reporting_period_start),
      },
      context.reporting_timezone
    );
    const report = await getAnalyticsSummaryModel({
      workspaceId: context.workspace_id,
      projectId: context.project_id,
      reportType: context.report_type,
      timezone: context.reporting_timezone,
      period,
    });
    if (
      report.period.start !==
        new Date(context.reporting_period_start).toISOString() ||
      report.period.end !== new Date(context.reporting_period_end).toISOString()
    ) {
      throw new NotificationPermanentError(
        "report_period_mismatch",
        "Analytics period did not match the delivery."
      );
    }
    const credentials = decryptIntegrationCredentials<{ accessToken?: string }>(
      context.encrypted_credentials
    );
    if (!credentials.accessToken) {
      throw new NotificationPermanentError(
        "invalid_auth",
        "Slack credentials are unavailable."
      );
    }
    const formattedReport = formatSlackAnalyticsReport({
      report,
      projectName: context.project_name,
      workspaceId: context.workspace_id,
      applicationUrl: process.env.FRONTEND_URL,
    });
    const outcome = await sendNotificationOnce({
      channel: settings.channelId,
      smoke: Boolean(smokeIntegrationId),
      reserve: () =>
        beginNotificationProviderSend(deliveryId, claimed.lockToken!),
      send: () =>
        postSlackMessage(
          credentials.accessToken!,
          settings.channelId,
          formattedReport.text,
          formattedReport.blocks,
          true
        ),
      persistSuccess: (providerId) =>
        updateNotificationSuccess(deliveryId, claimed.lockToken!, providerId),
    });
    if (outcome.status === "rejected") {
      providerRejectionProven = true;
      throw outcome.error;
    }
    if (outcome.status === "unknown") {
      logNotification("error", "notification_provider_outcome_unknown", {
        ...fields,
        errorCode: UNKNOWN_PROVIDER_CODE,
        unknownCount: 1,
      });
    } else if (outcome.status === "succeeded") {
      logNotification("info", "notification_delivered", fields);
    } else {
      logNotification(
        "warn",
        "notification_send_reservation_lease_lost",
        fields
      );
    }
  } catch (error) {
    const failure = classifyNotificationError(error);
    if (failure.code === "invalid_auth" || failure.code === "token_revoked") {
      await markSlackIntegrationInvalid(claimed.projectIntegrationId);
    }
    const isFinal =
      failure.category !== "retryable" || claimed.attempts >= MAX_ATTEMPTS;
    const updated = await updateNotificationFailure({
      deliveryId,
      lockToken: claimed.lockToken!,
      status:
        failure.category === "cancelled"
          ? "cancelled"
          : isFinal
            ? "permanent_failed"
            : "retryable_failed",
      code: failure.code,
      message: failure.message,
      providerRejectionProven,
      nextAttemptAt:
        !isFinal && failure.category === "retryable"
          ? getNotificationRetryAt(claimed.attempts, failure.retryAfterSeconds)
          : null,
    });
    logNotification(
      isFinal ? "error" : "warn",
      "notification_delivery_failed",
      {
        ...fields,
        errorCode: failure.code,
        status:
          failure.category === "cancelled"
            ? "cancelled"
            : isFinal
              ? "permanent_failed"
              : "retryable_failed",
        retryAt: !isFinal
          ? getNotificationRetryAt(
              claimed.attempts,
              failure.retryAfterSeconds
            ).toISOString()
          : null,
        leaseOwned: updated,
      }
    );
    if (failure.category === "retryable" && !isFinal) throw error;
  }
}

type SqsEvent = { Records: Array<{ messageId: string; body: string }> };

export async function handler(event: SqsEvent) {
  const batchItemFailures: Array<{ itemIdentifier: string }> = [];
  for (const record of event.Records) {
    try {
      const message = parseMessage(record.body);
      await processNotificationDelivery(message.deliveryId);
    } catch (error) {
      const failure = classifyNotificationError(error);
      logNotification("error", "notification_record_failed", {
        messageId: record.messageId,
        errorCode: failure.code,
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }
  return { batchItemFailures };
}
