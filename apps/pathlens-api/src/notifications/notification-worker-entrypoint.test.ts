import assert from "node:assert/strict";
import test from "node:test";

import { getNotificationSmokeMockError } from "./notification-worker-entrypoint";

test("maps deterministic smoke outcomes to ambiguous provider errors", () => {
  assert.equal(getNotificationSmokeMockError("timeout").code, "timeout");
  assert.equal(
    getNotificationSmokeMockError("connection_reset").code,
    "network_error"
  );
  assert.equal(
    getNotificationSmokeMockError("unreadable_response").code,
    "unconfirmed_response"
  );
});

test("rejects unknown smoke outcomes", () => {
  assert.throws(
    () => getNotificationSmokeMockError("success"),
    /PATHLENS_NOTIFICATION_MOCK_OUTCOME/
  );
});
