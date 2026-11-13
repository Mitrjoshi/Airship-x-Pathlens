import assert from "node:assert/strict";
import test from "node:test";

import { SlackApiError } from "../lib/slack-api";
import {
  classifyNotificationError,
  getNotificationRetryAt,
} from "./notification-worker";

test("classifies Slack rate limits as retryable and preserves Retry-After", () => {
  assert.deepEqual(
    classifyNotificationError(new SlackApiError("ratelimited", 120, 429)),
    {
      category: "retryable",
      code: "ratelimited",
      message: "Slack rate limit",
      retryAfterSeconds: 120,
    }
  );
});

test("classifies invalid Slack credentials and channels as permanent", () => {
  assert.equal(
    classifyNotificationError(new SlackApiError("token_revoked")).category,
    "permanent"
  );
  assert.equal(
    classifyNotificationError(new SlackApiError("channel_not_found")).category,
    "permanent"
  );
});

test("uses bounded exponential backoff with a provider delay floor", () => {
  const now = Date.parse("2026-01-01T00:00:00.000Z");
  assert.equal(
    getNotificationRetryAt(1, undefined, now).toISOString(),
    "2026-01-01T00:01:03.000Z"
  );
  assert.equal(
    getNotificationRetryAt(3, 120, now).toISOString(),
    "2026-01-01T00:04:03.000Z"
  );
});
