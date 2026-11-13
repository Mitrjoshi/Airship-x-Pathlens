import assert from "node:assert/strict";
import test from "node:test";

import { getSafeRequestPath } from "./request-logging";

test("request logging removes all query parameters", () => {
  const path = getSafeRequestPath(
    "/api/integrations/slack/callback?code=secret-code&state=secret-state"
  );
  assert.equal(path, "/api/integrations/slack/callback");
  assert.equal(path.includes("secret"), false);
});
