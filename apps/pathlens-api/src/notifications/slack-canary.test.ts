import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { CANARY_TARGET, prepareSlackCanary } from "./slack-canary";

test("canary rejects unrelated integrations before formatting", () => {
  assert.throws(
    () =>
      prepareSlackCanary({
        ...CANARY_TARGET,
        integrationId: "unrelated",
      } as Parameters<typeof prepareSlackCanary>[0]),
    /ownership/
  );
});

test("canary rejects an unapproved destination", () => {
  assert.throws(
    () =>
      prepareSlackCanary({
        ...CANARY_TARGET,
        report: { projectId: CANARY_TARGET.projectId, reportType: "daily" },
        destinationChannel: "COTHER",
        configuredChannel: "CAPPROVED",
      } as Parameters<typeof prepareSlackCanary>[0]),
    /destination/
  );
});

test("preparation has no send, queue, dispatcher, or delivery entrypoints", () => {
  for (const file of [
    "../scripts/prepare-slack-canary.ts",
    "slack-canary.ts",
  ]) {
    const source = fs.readFileSync(path.resolve(__dirname, file), "utf8");
    assert.doesNotMatch(
      source,
      /postSlackMessage|chat\.postMessage|notification-dispatcher|notification-delivery|client-sqs|UPDATE |INSERT |DELETE /
    );
  }
});
