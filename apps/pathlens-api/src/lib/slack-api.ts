const SLACK_API_URL = "https://slack.com/api";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_CHANNEL_PAGES = 20;

export type SlackMessageResult = { ts?: string; channel?: string };
export type SlackMessageTransport = (
  accessToken: string,
  channelId: string,
  text: string,
  blocks?: ReadonlyArray<Record<string, unknown>>
) => Promise<SlackMessageResult>;

let testMessageTransport: SlackMessageTransport | undefined;

export function setSlackMessageTransportForTests(
  transport: SlackMessageTransport | undefined
) {
  if (process.env.PATHLENS_NOTIFICATION_MOCK_SLACK !== "true") {
    throw new Error(
      "PATHLENS_NOTIFICATION_MOCK_SLACK=true is required for a test Slack transport."
    );
  }
  testMessageTransport = transport;
}

export class SlackApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryAfterSeconds?: number,
    public readonly status?: number
  ) {
    super(`Slack API error: ${code}`);
  }
}

async function slackRequest<T>(
  accessToken: string,
  method: string,
  params: Record<string, string> = {},
  body?: Record<string, unknown>,
  strictOneAttempt = false
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = new URL(`${SLACK_API_URL}/${method}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
      ...(strictOneAttempt ? { redirect: "error" as const } : {}),
      method: body ? "POST" : "GET",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "");
      throw new SlackApiError(
        "ratelimited",
        Number.isFinite(retryAfter) ? retryAfter : undefined,
        429
      );
    }

    const data = (await response.json()) as T & {
      ok?: boolean;
      error?: string;
    };
    if (!response.ok || data.ok === false) {
      throw new SlackApiError(
        data.error ?? "request_failed",
        undefined,
        response.status
      );
    }
    if (strictOneAttempt && body && data.ok !== true) {
      throw new SlackApiError(
        "unconfirmed_response",
        undefined,
        response.status
      );
    }
    return data;
  } catch (error) {
    if (error instanceof SlackApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new SlackApiError("timeout");
    }
    throw new SlackApiError("network_error");
  } finally {
    clearTimeout(timeout);
  }
}

export type SlackChannel = {
  id: string;
  name: string;
  is_member: boolean;
  is_archived: boolean;
  is_private?: boolean;
  num_members?: number;
  topic?: { value?: string };
  purpose?: { value?: string };
};

export async function listSlackChannels(accessToken: string) {
  const channels: SlackChannel[] = [];
  let cursor = "";

  for (let page = 0; page < MAX_CHANNEL_PAGES; page += 1) {
    const data = await slackRequest<{
      channels?: SlackChannel[];
      response_metadata?: { next_cursor?: string };
    }>(accessToken, "conversations.list", {
      types: "public_channel,private_channel",
      exclude_archived: "true",
      limit: "200",
      ...(cursor ? { cursor } : {}),
    });
    channels.push(
      ...(data.channels ?? []).filter((channel) => !channel.is_archived)
    );
    cursor = data.response_metadata?.next_cursor?.trim() ?? "";
    if (!cursor) break;
  }

  return channels;
}

export async function getSlackChannel(accessToken: string, channelId: string) {
  const data = await slackRequest<{ channel?: SlackChannel }>(
    accessToken,
    "conversations.info",
    { channel: channelId }
  );
  return data.channel;
}

export async function getSlackCanaryIdentity(accessToken: string) {
  return slackRequest<{ team: string; team_id: string }>(
    accessToken,
    "auth.test"
  );
}

export async function readSlackCanaryMessage(
  accessToken: string,
  channel: string,
  ts: string
) {
  return slackRequest<{ messages?: Array<{ ts?: string; text?: string }> }>(
    accessToken,
    "conversations.history",
    { channel, oldest: ts, latest: ts, inclusive: "true", limit: "1" }
  );
}

export async function postSlackMessage(
  accessToken: string,
  channelId: string,
  text: string,
  blocks?: ReadonlyArray<Record<string, unknown>>,
  strictOneAttempt = false
) {
  if (process.env.PATHLENS_NOTIFICATION_MOCK_SLACK === "true") {
    if (!testMessageTransport) {
      throw new Error(
        "The notification test Slack transport is not configured."
      );
    }
    return testMessageTransport(accessToken, channelId, text, blocks);
  }
  return slackRequest<{ ts?: string; channel?: string }>(
    accessToken,
    "chat.postMessage",
    {},
    { channel: channelId, text, ...(blocks?.length ? { blocks } : {}) },
    strictOneAttempt
  );
}

export async function inviteSlackUser(
  accessToken: string,
  channelId: string,
  userId: string
) {
  return slackRequest<{ channel?: SlackChannel }>(
    accessToken,
    "conversations.invite",
    {},
    { channel: channelId, users: userId }
  );
}
