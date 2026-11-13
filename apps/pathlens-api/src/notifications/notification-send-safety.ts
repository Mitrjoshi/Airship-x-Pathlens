import { SlackApiError, type SlackMessageResult } from "../lib/slack-api";

export const UNKNOWN_PROVIDER_CODE = "provider_outcome_unknown";

export function isDefinitiveSlackRejection(error: unknown) {
  if (!(error instanceof SlackApiError)) return false;
  if (error.status === 429 && error.code === "ratelimited") return true;
  return (
    error.status !== undefined &&
    error.status >= 200 &&
    error.status < 500 &&
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
  );
}

export async function sendNotificationOnce(input: {
  channel: string;
  smoke: boolean;
  reserve: () => Promise<boolean>;
  send: () => Promise<SlackMessageResult>;
  persistSuccess: (providerMessageId: string) => Promise<boolean>;
}): Promise<
  | { status: "succeeded" | "unknown" | "lease_lost" }
  | { status: "rejected"; error: SlackApiError }
> {
  // reserve resolves only after durable commit AND independent read-back.
  // A thrown/ambiguous reservation must never be followed by a send.
  if (!(await input.reserve())) return { status: "lease_lost" };
  let result: SlackMessageResult;
  try {
    result = await input.send();
  } catch (error) {
    return isDefinitiveSlackRejection(error)
      ? { status: "rejected", error: error as SlackApiError }
      : { status: "unknown" };
  }
  if (
    result?.channel !== input.channel ||
    typeof result?.ts !== "string" ||
    !(
      /^\d+\.\d+$/.test(result.ts) ||
      (input.smoke && /^smoke-\d+$/.test(result.ts))
    )
  ) {
    return { status: "unknown" };
  }
  try {
    return {
      status: (await input.persistSuccess(`${result.channel}:${result.ts}`))
        ? "succeeded"
        : "unknown",
    };
  } catch {
    // Slack accepted: never downgrade to retryable after persistence failure.
    return { status: "unknown" };
  }
}
