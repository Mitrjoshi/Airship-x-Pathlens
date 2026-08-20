import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import type { Request } from "express";
import { getClientIp, getGeoLocation } from "./geoip";

const require = createRequire(import.meta.url);
const geoip = require("geoip-lite") as {
  lookup: (ip: string) => { country?: string } | null;
};

function mockRequest(
  overrides: Partial<Pick<Request, "ip">> & {
    socket?: Partial<Request["socket"]>;
  }
): Request {
  return {
    ip: "1.2.3.4",
    socket: { remoteAddress: "5.6.7.8" },
    ...overrides,
  } as Request;
}

test("IPv4 lookup resolves country code", () => {
  const geo = getGeoLocation("8.8.8.8");

  assert.ok(geo);
  assert.equal(geo.countryCode, "US");
  assert.equal(geo.country, "US");
  assert.equal(geo.timezone, "America/Chicago");
});

test("IPv6 lookup resolves country code", () => {
  const geo = getGeoLocation("2001:4860:4860::8888");

  assert.ok(geo);
  assert.equal(geo.countryCode, "US");
});

test("IPv4-mapped IPv6 resolves like IPv4", () => {
  const mapped = getGeoLocation("::ffff:8.8.8.8");
  const plain = getGeoLocation("8.8.8.8");

  assert.ok(mapped);
  assert.equal(mapped.countryCode, plain?.countryCode);
});

test("localhost returns null", () => {
  assert.equal(getGeoLocation("127.0.0.1"), null);
  assert.equal(getGeoLocation("::1"), null);
});

test("private IPs return null", () => {
  assert.equal(getGeoLocation("10.0.0.1"), null);
  assert.equal(getGeoLocation("192.168.1.1"), null);
  assert.equal(getGeoLocation("172.16.0.1"), null);
});

test("invalid IPs return null", () => {
  assert.equal(getGeoLocation("999.999.999.999"), null);
  assert.equal(getGeoLocation("not-an-ip"), null);
  assert.equal(getGeoLocation(""), null);
});

test("missing IP returns null", () => {
  assert.equal(getGeoLocation(null), null);
  assert.equal(getGeoLocation(undefined as unknown as string), null);
});

test("unknown IP returns null", () => {
  assert.equal(getGeoLocation("0.0.0.0"), null);
});

test("geoip lookup failure does not throw", () => {
  const original = geoip.lookup;

  geoip.lookup = () => {
    throw new Error("boom");
  };

  try {
    assert.equal(getGeoLocation("8.8.8.8"), null);
  } finally {
    geoip.lookup = original;
  }
});

test("getClientIp uses req.ip", () => {
  assert.equal(getClientIp(mockRequest({ ip: "203.0.113.7" })), "203.0.113.7");
});

test("getClientIp strips IPv4-mapped IPv6", () => {
  assert.equal(
    getClientIp(mockRequest({ ip: "::ffff:203.0.113.7" })),
    "203.0.113.7"
  );
});

test("getClientIp falls back to socket remoteAddress", () => {
  const req = mockRequest({
    ip: undefined,
    socket: { remoteAddress: "203.0.113.8" },
  });

  assert.equal(getClientIp(req), "203.0.113.8");
});

test("getClientIp returns null for invalid addresses", () => {
  assert.equal(getClientIp(mockRequest({ ip: "not-an-ip" })), null);
  assert.equal(getClientIp(mockRequest({ ip: undefined, socket: {} })), null);
});
