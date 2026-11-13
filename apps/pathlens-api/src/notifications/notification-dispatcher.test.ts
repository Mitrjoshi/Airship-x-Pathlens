import assert from "node:assert/strict";
import test from "node:test";

import {
  getNotificationShard,
  NOTIFICATION_SHARD_COUNT,
} from "./notification-dispatcher";

test("assigns each minute to one of eight deterministic shards", () => {
  const start = new Date("2026-01-01T00:00:00.000Z");
  const shards = Array.from({ length: NOTIFICATION_SHARD_COUNT }, (_, offset) =>
    getNotificationShard(new Date(start.getTime() + offset * 60 * 1000))
  );
  assert.deepEqual(shards, [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(
    getNotificationShard(new Date(start.getTime() + 8 * 60 * 1000)),
    shards[0]
  );
});
