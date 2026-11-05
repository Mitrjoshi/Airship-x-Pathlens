import assert from "node:assert/strict";
import test from "node:test";

import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from "./credential-encryption";

test("integration credentials round-trip through authenticated encryption", () => {
  process.env.INTEGRATION_ENCRYPTION_KEY = "a".repeat(64);
  const encrypted = encryptIntegrationCredentials({
    accessToken: "xoxb-secret",
  });

  assert.notEqual(encrypted, JSON.stringify({ accessToken: "xoxb-secret" }));
  assert.equal(
    decryptIntegrationCredentials<{ accessToken: string }>(encrypted)
      .accessToken,
    "xoxb-secret"
  );
});

test("tampered integration credentials fail authentication", () => {
  process.env.INTEGRATION_ENCRYPTION_KEY = "a".repeat(64);
  const stored = JSON.parse(
    encryptIntegrationCredentials({ accessToken: "secret" })
  );
  stored.ciphertext = `${stored.ciphertext.slice(0, -2)}AA`;

  assert.throws(() => decryptIntegrationCredentials(JSON.stringify(stored)));
});
