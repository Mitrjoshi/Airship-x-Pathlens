import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { CANARY_TARGET } from "./slack-canary";
import {
  APPROVED_CHANNEL,
  APPROVED_PERIOD,
  executeCanary,
} from "./slack-canary-send";
import { SlackApiError, postSlackMessage } from "../lib/slack-api";

const dashboard =
  "https://d1zadf3to2hh75.cloudfront.net/app/d1158722-969a-48cc-9fc4-ede482ebf69f/ccfd246f-cb0c-4ee5-a143-dd3bce3e5780";
const message = {
  channel: APPROVED_CHANNEL,
  text: `Pathlens — Test Notification\nOne-time test only — not an automatically scheduled report.\nPathlens — Daily Analytics Report\nProject: Portfolio\nReporting period: November 11, 2026 (Asia/Kolkata)\nUnique visitors: 2 (New activity)\nSessions: 2 (New activity)\nPage views: 2 (New activity)\nTotal events: 7 (New activity)\nView dashboard: ${dashboard}`,
  blocks: [
    {
      type: "header",
      text: { type: "plain_text", text: "Pathlens — Test Notification" },
    },
    {
      type: "section",
      text: {
        type: "plain_text",
        text: "One-time test only — not an automatically scheduled report.",
      },
    },
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "Pathlens — Daily Analytics Report",
        emoji: false,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "*Project:* Portfolio  •  *Period:* November 11, 2026  •  *Timezone:* Asia/Kolkata",
        },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: "*Unique visitors*\n2\n_New activity_" },
        { type: "mrkdwn", text: "*Sessions*\n2\n_New activity_" },
        { type: "mrkdwn", text: "*Page views*\n2\n_New activity_" },
        { type: "mrkdwn", text: "*Total events*\n7\n_New activity_" },
      ],
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Top pages*\n1. / — 2 views (New activity)",
      },
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View dashboard", emoji: false },
          url: dashboard,
          action_id: "view_pathlens_dashboard",
        },
      ],
    },
    {
      type: "context",
      elements: [{ type: "mrkdwn", text: "Pathlens analytics summary" }],
    },
  ],
};
const input = {
  ...CANARY_TARGET,
  slackWorkspace: "Pathlens",
  projectName: "Portfolio",
  period: APPROVED_PERIOD,
  message,
  accessToken: "fake-test-only",
};
const originalFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = originalFetch;
});
for (const failure of ["AbortError", "ECONNRESET"]) {
  test(`strict HTTP transport makes one request without redirect or retry: ${failure}`, async () => {
    let calls = 0;
    globalThis.fetch = async (_url, init) => {
      calls++;
      assert.equal(init?.redirect, "error");
      const e = new Error(failure);
      e.name = failure;
      throw e;
    };
    await assert.rejects(
      postSlackMessage("fake", APPROVED_CHANNEL, "test", [], true)
    );
    assert.equal(calls, 1);
  });
}
function store() {
  let consumed = false;
  const statuses: string[] = [];
  return {
    statuses,
    async reserve() {
      if (consumed) return false;
      consumed = true;
      return true;
    },
    async record(s: string) {
      statuses.push(s);
    },
  };
}

for (const phase of [
  "connection",
  "reservation",
  "commit",
  "post_commit_verification",
]) {
  test(`no Slack call when persistence fails during ${phase}`, async () => {
    let calls = 0;
    await assert.rejects(
      executeCanary(
        input,
        {
          async reserve() {
            throw new Error(`Mock ${phase} failure`);
          },
          async record() {
            throw new Error("must not record Slack status");
          },
        },
        async () => {
          calls++;
          return { channel: APPROVED_CHANNEL, ts: "1.1" };
        }
      )
    );
    assert.equal(calls, 0);
  });
}

test("approved payload: concurrent and duplicate commands permit exactly one send", async () => {
  const s = store();
  let calls = 0;
  const send = async () => {
    calls++;
    return { channel: APPROVED_CHANNEL, ts: "1.1" };
  };
  const results = await Promise.allSettled([
    executeCanary(input, s, send),
    executeCanary(input, s, send),
  ]);
  assert.equal(calls, 1);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  await assert.rejects(executeCanary(input, s, send), /consumed/);
  assert.equal(calls, 1);
});
for (const label of [
  "timeout",
  "ECONNRESET",
  "interruption after reservation",
  "unknown response",
]) {
  test(`${label}: consumed permanently without retry`, async () => {
    const s = store();
    let calls = 0;
    const result = await executeCanary(input, s, async () => {
      calls++;
      throw Error(label);
    });
    assert.equal(result.status, "UNKNOWN");
    assert.equal(calls, 1);
    await assert.rejects(
      executeCanary(input, s, async () => {
        throw Error("must not send");
      }),
      /consumed/
    );
  });
}
test("explicit Slack rejection is not retried", async () => {
  const s = store();
  let calls = 0;
  const r = await executeCanary(input, s, async () => {
    calls++;
    throw new SlackApiError("channel_not_found", undefined, 200);
  });
  assert.equal(r.status, "REJECTED");
  assert.equal(calls, 1);
});
test("previously committed reservation survives command restart", async () => {
  const s = store();
  await s.reserve();
  await assert.rejects(
    executeCanary(input, s, async () => {
      throw Error("must not send");
    }),
    /consumed/
  );
});
for (const override of [
  { integrationId: "other" },
  { projectId: "other" },
  { workspaceId: "other" },
  { accessToken: "" },
  { message: { ...message, channel: "COTHER" } },
  { message: { ...message, text: "changed" } },
  { period: { ...APPROVED_PERIOD, end: "2026-11-12" } },
]) {
  test(`invalid target/payload/credentials rejected: ${Object.keys(override)}`, async () => {
    let reserved = false;
    await assert.rejects(
      executeCanary(
        { ...input, ...override },
        {
          async reserve() {
            reserved = true;
            return true;
          },
          async record() {},
        },
        async () => {
          throw Error("must not send");
        }
      )
    );
    assert.equal(reserved, false);
  });
}
test("send command uses durable atomic insert and no scheduling interfaces", () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, "../scripts/send-slack-canary.ts"),
    "utf8"
  );
  assert.match(source, /createCanaryStore\(pool, prepared.actorUserId\)/);
  assert.doesNotMatch(
    source,
    /notification-dispatcher|notification-delivery|client-sqs|SendMessage|UPDATE project_integrations/
  );
});
