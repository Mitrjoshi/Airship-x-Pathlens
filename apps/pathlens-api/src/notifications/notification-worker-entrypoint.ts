import {
  SlackApiError,
  setSlackMessageTransportForTests,
} from "../lib/slack-api";
import { validateNotificationEnvironment } from "./notification-environment";

export type NotificationSmokeMockOutcome =
  "timeout" | "connection_reset" | "unreadable_response";

export function getNotificationSmokeMockError(outcome: string) {
  switch (outcome) {
    case "timeout":
      return new SlackApiError("timeout");
    case "connection_reset":
      return new SlackApiError("network_error");
    case "unreadable_response":
      return new SlackApiError("unconfirmed_response");
    default:
      throw new Error(
        "PATHLENS_NOTIFICATION_MOCK_OUTCOME must be timeout, connection_reset, or unreadable_response."
      );
  }
}

function configureSmokeTransport() {
  if (process.env.PATHLENS_NOTIFICATION_SMOKE_TEST !== "true") return;
  if (!process.env.PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID?.trim()) {
    throw new Error(
      "PATHLENS_NOTIFICATION_TEST_INTEGRATION_ID is required in smoke-test mode."
    );
  }
  process.env.PATHLENS_NOTIFICATION_MOCK_SLACK = "true";
  const outcome = process.env.PATHLENS_NOTIFICATION_MOCK_OUTCOME?.trim();
  if (outcome) {
    setSlackMessageTransportForTests(async () => {
      throw getNotificationSmokeMockError(outcome);
    });
  } else {
    setSlackMessageTransportForTests(async (_token, channelId) => ({
      channel: channelId,
      ts: `smoke-${Date.now()}`,
    }));
  }
}

export async function handler(event: {
  Records: Array<{ messageId: string; body: string }>;
}) {
  validateNotificationEnvironment("worker");
  configureSmokeTransport();
  const runtime = await import("./notification-worker");
  return runtime.handler(event);
}
