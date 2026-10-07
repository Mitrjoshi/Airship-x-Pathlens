import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isProjectOriginAllowed,
  normalizeProjectDomains,
} from "./project-domain";

test("allows the configured hostname and www variant", () => {
  assert.equal(
    isProjectOriginAllowed(
      ["https://example.com", "other.example.com"],
      "https://example.com",
      undefined
    ),
    true
  );
  assert.equal(
    isProjectOriginAllowed(
      ["example.com", "other.example.com"],
      "https://www.example.com",
      undefined
    ),
    true
  );
  assert.equal(
    isProjectOriginAllowed(
      ["example.com", "other.example.com"],
      "https://other.example.com",
      undefined
    ),
    true
  );
});

test("rejects other subdomains and unrelated domains", () => {
  assert.equal(
    isProjectOriginAllowed(
      ["example.com"],
      "https://app.example.com",
      undefined
    ),
    false
  );
  assert.equal(
    isProjectOriginAllowed(
      ["example.com"],
      "https://example.com.evil.test",
      undefined
    ),
    false
  );
});

test("rejects projects without a domain or a request origin", () => {
  assert.equal(
    isProjectOriginAllowed([], "https://example.com", undefined),
    false
  );
  assert.equal(
    isProjectOriginAllowed(["example.com"], undefined, undefined),
    false
  );
});

test("falls back to the referer when origin is unavailable", () => {
  assert.equal(
    isProjectOriginAllowed(
      ["example.com"],
      undefined,
      "https://www.example.com/page"
    ),
    true
  );
});

test("normalizes, deduplicates, and ignores invalid domains", () => {
  assert.deepEqual(
    normalizeProjectDomains([
      "HTTPS://Example.com/path",
      "example.com",
      "www.example.com",
      "not a domain",
    ]),
    ["https://example.com", "https://www.example.com"]
  );
});

test("adds HTTPS when the domain has no protocol and preserves explicit HTTP", () => {
  assert.equal(
    normalizeProjectDomains(["example.com"])[0],
    "https://example.com"
  );
  assert.equal(
    normalizeProjectDomains(["http://example.com/path"])[0],
    "http://example.com"
  );
});
