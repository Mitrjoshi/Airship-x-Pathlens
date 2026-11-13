import assert from "node:assert/strict";
import test from "node:test";

import {
  listSlackChannels,
  inviteSlackUser,
  postSlackMessage,
  SlackApiError,
} from "./slack-api";

const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("lists public, non-archived channels across cursors", async () => {
  const urls: string[] = [];
  globalThis.fetch = (async (input) => {
    urls.push(String(input));
    const page =
      urls.length === 1
        ? {
            ok: true,
            channels: [
              {
                id: "C1",
                name: "general",
                is_member: true,
                is_archived: false,
              },
              { id: "C2", name: "old", is_member: true, is_archived: true },
            ],
            response_metadata: { next_cursor: "next" },
          }
        : {
            ok: true,
            channels: [
              {
                id: "C3",
                name: "alerts",
                is_member: false,
                is_archived: false,
              },
            ],
            response_metadata: { next_cursor: "" },
          };
    return new Response(JSON.stringify(page), { status: 200 });
  }) as typeof fetch;

  const channels = await listSlackChannels("token");

  assert.deepEqual(
    channels.map((channel) => channel.id),
    ["C1", "C3"]
  );
  assert.match(urls[0], /types=public_channel%2Cprivate_channel/);
  assert.match(urls[1], /cursor=next/);
});

test("invites a Slack user to a channel", async () => {
  let request: Request | undefined;
  globalThis.fetch = (async (input, init) => {
    request = new Request(input, init);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }) as typeof fetch;

  await inviteSlackUser("user-token", "C1", "U1");

  assert.equal(request?.method, "POST");
  assert.equal(request?.headers.get("authorization"), "Bearer user-token");
  assert.deepEqual(await request?.json(), { channel: "C1", users: "U1" });
});

test("surfaces Slack rate limits without leaking response data", async () => {
  globalThis.fetch = (async () =>
    new Response("{}", {
      status: 429,
      headers: { "retry-after": "12" },
    })) as typeof fetch;

  await assert.rejects(
    () => listSlackChannels("token"),
    (error: unknown) =>
      error instanceof SlackApiError &&
      error.code === "ratelimited" &&
      error.retryAfterSeconds === 12
  );
});

test("posts a test message through Slack chat.postMessage", async () => {
  let request: Request | undefined;
  globalThis.fetch = (async (input, init) => {
    request = new Request(input, init);
    return new Response(JSON.stringify({ ok: true, ts: "123.456" }), {
      status: 200,
    });
  }) as typeof fetch;

  const result = await postSlackMessage("token", "C1", "Pathlens test");

  assert.equal(result.ts, "123.456");
  assert.equal(request?.headers.get("authorization"), "Bearer token");
  assert.deepEqual(await request?.json(), {
    channel: "C1",
    text: "Pathlens test",
  });
});

test("posts Block Kit blocks while retaining the plain-text fallback", async () => {
  let request: Request | undefined;
  globalThis.fetch = (async (input, init) => {
    request = new Request(input, init);
    return new Response(JSON.stringify({ ok: true, ts: "123.457" }), {
      status: 200,
    });
  }) as typeof fetch;

  await postSlackMessage("token", "C1", "Fallback report", [
    { type: "header", text: { type: "plain_text", text: "Report" } },
  ]);

  assert.deepEqual(await request?.json(), {
    channel: "C1",
    text: "Fallback report",
    blocks: [{ type: "header", text: { type: "plain_text", text: "Report" } }],
  });
});
