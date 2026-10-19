import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeReplayChunk, sanitizeReplayEvents } from "./replay-privacy";

test("preserves normal text and masks sensitive content", () => {
  const [event] = sanitizeReplayEvents([
    {
      type: 2,
      timestamp: 123,
      data: {
        node: {
          text: "Customer alice@example.com viewed the pricing page",
          attributes: {
            value: "alice@example.com",
            placeholder: "Enter your email",
          },
        },
      },
    },
  ]);

  assert.equal(event?.timestamp, 123);
  assert.equal(
    (event?.data as { node: { text: string } }).node.text,
    `Customer ${"*".repeat("alice@example.com".length)} viewed the pricing page`
  );
  assert.equal(
    (
      event?.data as {
        node: { attributes: { value: string; placeholder: string } };
      }
    ).node.attributes.value,
    "*".repeat("alice@example.com".length)
  );
  assert.equal(
    (
      event?.data as {
        node: { attributes: { value: string; placeholder: string } };
      }
    ).node.attributes.placeholder,
    "Enter your email"
  );
});

test("removes query strings, fragments, and email addresses from locations", () => {
  const chunk = sanitizeReplayChunk({
    projectId: "project-id",
    sessionId: "session-id",
    visitorId: "visitor-id",
    sequence: 0,
    events: [{ type: 2, timestamp: 123, data: {} }],
    url: "https://example.com/account/alice@example.com?token=secret#billing",
    path: "/account/alice@example.com?token=secret#billing",
  });

  const maskedEmail = "*".repeat("alice@example.com".length);

  assert.equal(chunk.url, `https://example.com/account/${maskedEmail}`);
  assert.equal(chunk.path, `/account/${maskedEmail}`);
});
