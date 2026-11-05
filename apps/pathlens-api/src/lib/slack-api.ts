const SLACK_API_URL = "https://slack.com/api";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_CHANNEL_PAGES = 20;

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
  body?: Record<string, unknown>
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const url = new URL(`${SLACK_API_URL}/${method}`);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    const response = await fetch(url, {
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
      types: "public_channel",
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

export async function postSlackMessage(
  accessToken: string,
  channelId: string,
  text: string
) {
  return slackRequest<{ ts?: string; channel?: string }>(
    accessToken,
    "chat.postMessage",
    {},
    { channel: channelId, text }
  );
}
