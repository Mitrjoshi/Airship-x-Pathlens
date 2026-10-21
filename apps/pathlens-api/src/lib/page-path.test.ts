import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizePagePath } from "@workspace/contracts";
import { normalizeProjectHostname } from "./project-domain";

test("normalizes root and trailing slashes", () => {
  assert.equal(normalizePagePath("/"), "/");
  assert.equal(normalizePagePath(""), "/");
  assert.equal(normalizePagePath("/contact/"), "/contact");
  assert.equal(normalizePagePath("/contact//"), "/contact");
});

test("removes query strings and fragments", () => {
  assert.equal(normalizePagePath("/contact?source=google"), "/contact");
  assert.equal(normalizePagePath("/contact#section"), "/contact");
});

test("extracts the pathname from absolute and protocol-relative URLs", () => {
  assert.equal(
    normalizePagePath("https://example.com/contact?source=google#section"),
    "/contact"
  );
  assert.equal(normalizePagePath("//example.com/about/"), "/about");
});

test("adds a leading slash without changing internal double slashes", () => {
  assert.equal(normalizePagePath("contact"), "/contact");
  assert.equal(normalizePagePath("/docs//part/"), "/docs//part");
});

test("handles malformed URLs without throwing", () => {
  assert.equal(normalizePagePath("https://[invalid"), "/");
  assert.equal(normalizePagePath("/contact?%invalid"), "/contact");
});

test("keeps identical paths distinguishable by hostname", () => {
  assert.equal(normalizePagePath("https://example.com/contact"), "/contact");
  assert.equal(normalizePagePath("https://another.com/contact"), "/contact");
  assert.notEqual(
    normalizeProjectHostname("example.com"),
    normalizeProjectHostname("another.com")
  );
});

test("does not use substring matching for similar paths", () => {
  assert.notEqual(
    normalizePagePath("/contact"),
    normalizePagePath("/contact-us")
  );
});
