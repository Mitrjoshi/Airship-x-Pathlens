import assert from "node:assert/strict";
import { test } from "node:test";
import { isProjectOriginAllowed } from "./project-domain";

test("allows the configured hostname and www variant", () => {
  assert.equal(
    isProjectOriginAllowed(
      "https://example.com",
      "https://example.com",
      undefined
    ),
    true
  );
  assert.equal(
    isProjectOriginAllowed("example.com", "https://www.example.com", undefined),
    true
  );
});

test("rejects other subdomains and unrelated domains", () => {
  assert.equal(
    isProjectOriginAllowed("example.com", "https://app.example.com", undefined),
    false
  );
  assert.equal(
    isProjectOriginAllowed(
      "example.com",
      "https://example.com.evil.test",
      undefined
    ),
    false
  );
});

test("rejects projects without a domain or a request origin", () => {
  assert.equal(
    isProjectOriginAllowed(null, "https://example.com", undefined),
    false
  );
  assert.equal(
    isProjectOriginAllowed("example.com", undefined, undefined),
    false
  );
});

test("falls back to the referer when origin is unavailable", () => {
  assert.equal(
    isProjectOriginAllowed(
      "example.com",
      undefined,
      "https://www.example.com/page"
    ),
    true
  );
});
