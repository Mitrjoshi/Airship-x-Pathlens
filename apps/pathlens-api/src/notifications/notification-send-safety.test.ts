import assert from "node:assert/strict";
import test from "node:test";
import { SlackApiError, postSlackMessage } from "../lib/slack-api";
import { sendNotificationOnce } from "./notification-send-safety";

const originalFetch = globalThis.fetch;
const previousMock = process.env.PATHLENS_NOTIFICATION_MOCK_SLACK;
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (previousMock === undefined)
    delete process.env.PATHLENS_NOTIFICATION_MOCK_SLACK;
  else process.env.PATHLENS_NOTIFICATION_MOCK_SLACK = previousMock;
});

function fixture() {
  let terminal = false;
  let posts = 0;
  let writes = 0;
  return {
    get posts() {
      return posts;
    },
    get writes() {
      return writes;
    },
    input: {
      channel: "CAPPROVED",
      smoke: false,
      async reserve() {
        if (terminal) return false;
        terminal = true;
        return true;
      },
      async send() {
        posts++;
        return { channel: "CAPPROVED", ts: "123.456" };
      },
      async persistSuccess() {
        writes++;
        return true;
      },
    },
  };
}

for (const label of [
  "timeout after transmission",
  "connection reset",
  "accepted but response lost",
]) {
  test(`${label} stays terminal and cannot post again`, async () => {
    const f = fixture();
    f.input.send = async () => {
      throw new SlackApiError(
        label === "timeout after transmission" ? "timeout" : "network_error"
      );
    };
    assert.equal((await sendNotificationOnce(f.input)).status, "unknown");
    assert.equal((await sendNotificationOnce(f.input)).status, "lease_lost");
    assert.equal(f.writes, 0);
  });
}
test("HTTP 5xx is ambiguous even when body names a normally permanent error", async () => {
  const f = fixture();
  f.input.send = async () => {
    throw new SlackApiError("invalid_auth", undefined, 503);
  };
  assert.equal((await sendNotificationOnce(f.input)).status, "unknown");
});
test("success persistence failure cannot enable a second provider attempt", async () => {
  const f = fixture();
  f.input.persistSuccess = async () => {
    throw Error("DB lost response");
  };
  assert.equal((await sendNotificationOnce(f.input)).status, "unknown");
  assert.equal((await sendNotificationOnce(f.input)).status, "lease_lost");
  assert.equal(f.posts, 1);
});
test("fenced-out success remains unknown", async () => {
  const f = fixture();
  f.input.persistSuccess = async () => false;
  assert.equal((await sendNotificationOnce(f.input)).status, "unknown");
});
test("crash after reservation / lease expiry and SQS redelivery cannot post", async () => {
  const f = fixture();
  await f.input.reserve();
  assert.equal((await sendNotificationOnce(f.input)).status, "lease_lost");
  assert.equal(f.posts, 0);
});
test("unconfirmed commit never permits provider I/O", async () => {
  const f = fixture();
  f.input.reserve = async () => {
    throw Error("COMMIT response lost");
  };
  await assert.rejects(sendNotificationOnce(f.input));
  assert.equal(f.posts, 0);
});
test("failure before any reservation can be retried", async () => {
  const f = fixture();
  const reserve = f.input.reserve;
  let failed = false;
  f.input.reserve = async () => {
    if (!failed) {
      failed = true;
      throw Error("connection unavailable before begin");
    }
    return reserve();
  };
  await assert.rejects(sendNotificationOnce(f.input));
  assert.equal((await sendNotificationOnce(f.input)).status, "succeeded");
  assert.equal(f.posts, 1);
});
for (const [code, status] of [
  ["ratelimited", 429],
  ["channel_not_found", 200],
  ["invalid_auth", 401],
] as const) {
  test(`proven Slack rejection classified separately: ${code}`, async () => {
    const f = fixture();
    f.input.send = async () => {
      throw new SlackApiError(code, 120, status);
    };
    const result = await sendNotificationOnce(f.input);
    assert.equal(result.status, "rejected");
    assert.equal(f.writes, 0);
  });
}
test("valid Slack success finalizes exactly once", async () => {
  const f = fixture();
  assert.equal((await sendNotificationOnce(f.input)).status, "succeeded");
  assert.equal((await sendNotificationOnce(f.input)).status, "lease_lost");
  assert.equal(f.posts, 1);
  assert.equal(f.writes, 1);
});
for (const response of [
  {},
  { channel: "COTHER", ts: "123.456" },
  { channel: "CAPPROVED", ts: "accepted" },
  null,
]) {
  test(`malformed or mismatched success is unknown: ${JSON.stringify(response)}`, async () => {
    const f = fixture();
    f.input.send = async () => response as { channel: string; ts: string };
    assert.equal((await sendNotificationOnce(f.input)).status, "unknown");
    assert.equal(f.writes, 0);
  });
}

for (const scenario of [
  {
    status: 503,
    body: { ok: false, error: "internal_error" },
    expected: "unknown",
  },
  {
    status: 200,
    body: { channel: "CAPPROVED", ts: "123.456" },
    expected: "unknown",
  },
  {
    status: 429,
    body: { ok: false, error: "ratelimited" },
    expected: "rejected",
  },
  {
    status: 200,
    body: { ok: false, error: "channel_not_found" },
    expected: "rejected",
  },
  {
    status: 200,
    body: { ok: true, channel: "CAPPROVED", ts: "123.456" },
    expected: "succeeded",
  },
]) {
  test(`strict scheduled HTTP classification ${scenario.status}: ${scenario.expected}`, async () => {
    process.env.PATHLENS_NOTIFICATION_MOCK_SLACK = "false";
    let calls = 0;
    globalThis.fetch = async (input, init) => {
      calls++;
      assert.ok(String(input).endsWith("/chat.postMessage"));
      assert.equal(init?.redirect, "error");
      return new Response(JSON.stringify(scenario.body), {
        status: scenario.status,
        headers: { "retry-after": "30" },
      });
    };
    const f = fixture();
    f.input.send = () =>
      postSlackMessage(
        "synthetic",
        "CAPPROVED",
        "test",
        [],
        true
      ) as ReturnType<typeof f.input.send>;
    assert.equal(
      (await sendNotificationOnce(f.input)).status,
      scenario.expected
    );
    assert.equal(calls, 1);
  });
}
