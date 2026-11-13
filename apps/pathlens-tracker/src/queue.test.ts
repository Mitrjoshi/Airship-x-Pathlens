import assert from "node:assert/strict";
import { test } from "node:test";
import type { PathLensConfig, TrackedEvent } from "@workspace/contracts/tracker";
import {
  enqueueEvent,
  flushQueue,
  MAX_ANALYTICS_EVENT_BYTES,
  MAX_ANALYTICS_QUEUE_BYTES,
  MAX_ANALYTICS_QUEUE_EVENTS,
  MAX_ANALYTICS_REQUEST_BYTES,
  MAX_KEEPALIVE_REQUEST_BYTES,
} from "./utils";

Object.assign(globalThis, {
  window: {
    setTimeout: (callback: () => void, delay: number) =>
      globalThis.setTimeout(callback, delay),
    clearTimeout: (handle: ReturnType<typeof setTimeout>) =>
      globalThis.clearTimeout(handle),
  },
});

const config: PathLensConfig = {
  apiKey: "test-project-key",
  apiUrl: "https://collector.test/api/events",
  replayApiUrl: "https://collector.test/api/replay/chunks",
  trackingScopes: ["events"],
  debug: false,
};

function event(id: string, text = ""): TrackedEvent {
  return {
    eventId: id,
    type: "custom",
    timestamp: "2026-01-01T00:00:00.000Z",
    sessionId: "session-1",
    visitorId: "visitor-1",
    url: "https://example.test/",
    path: "/",
    title: "Test",
    device: "desktop",
    browser: "Test",
    browserVersion: null,
    os: "Test",
    osVersion: null,
    language: "en-US",
    timezone: "UTC",
    userAgent: "test",
    referrer: "",
    text,
  } as TrackedEvent;
}

function response(status: number, headers?: Record<string, string>): Response {
  return new Response(null, { status, headers });
}

test("sends 25 events in one bounded batch and splits the 26th", { concurrency: false }, async () => {
  const requests: string[] = [];
  globalThis.fetch = async (_input, init) => {
    requests.push(String(init?.body ?? ""));
    return response(204);
  };

  const queue: TrackedEvent[] = [];
  for (let index = 0; index < 26; index += 1) {
    enqueueEvent(config, queue, event(`boundary-${index}`));
  }

  await flushQueue(config, queue);

  assert.equal(requests.length, 2);
  assert.equal(queue.length, 0);
});

test("serializes concurrent flushes and preserves events added during a request", { concurrency: false }, async () => {
  let resolveRequest: (() => void) | undefined;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    if (requestCount > 1) return response(204);
    await new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });
    return response(204);
  };

  const queue: TrackedEvent[] = [];
  enqueueEvent(config, queue, event("concurrent-1"));
  const flush = flushQueue(config, queue);
  const sameFlush = flushQueue(config, queue);
  for (let attempt = 0; attempt < 10 && requestCount === 0; attempt += 1) {
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, 1));
  }
  assert.equal(requestCount, 1);

  enqueueEvent(config, queue, event("during-flush"));
  resolveRequest?.();
  await flush;
  await sameFlush;

  assert.equal(requestCount, 2);
  assert.equal(queue.length, 0);
});

test("recursively splits HTTP 413 responses without changing event IDs", { concurrency: false }, async () => {
  const statuses = [413, 204, 204];
  const requestBodies: string[] = [];
  globalThis.fetch = async (_input, init) => {
    requestBodies.push(String(init?.body ?? ""));
    return response(statuses.shift() ?? 204);
  };

  const first = event("split-1");
  const second = event("split-2");
  const queue: TrackedEvent[] = [];
  enqueueEvent(config, queue, first);
  enqueueEvent(config, queue, second);

  await flushQueue(config, queue);

  assert.equal(requestBodies.length, 3);
  assert.equal(first.eventId, "split-1");
  assert.equal(second.eventId, "split-2");
  assert.equal(queue.length, 0);
});

test("drops a single event that the server rejects with 413", { concurrency: false }, async () => {
  globalThis.fetch = async () => response(413);
  const queue: TrackedEvent[] = [];
  enqueueEvent(config, queue, event("single-413"));

  await flushQueue(config, queue);

  assert.equal(queue.length, 0);
});

test("retries 429 using Retry-After and acknowledges the original event", { concurrency: false }, async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return requests === 1 ? response(429, { "Retry-After": "0" }) : response(204);
  };

  const queue: TrackedEvent[] = [];
  const original = event("retry-429");
  enqueueEvent(config, queue, original);
  await flushQueue(config, queue);

  assert.equal(requests, 2);
  assert.equal(queue.length, 0);
  assert.equal(original.eventId, "retry-429");
});

test("keeps final keepalive requests below the 32 KiB limit", { concurrency: false }, async () => {
  const requestSizes: number[] = [];
  globalThis.fetch = async (_input, init) => {
    requestSizes.push(new TextEncoder().encode(String(init?.body ?? "")).byteLength);
    return response(204);
  };

  const queue: TrackedEvent[] = [];
  enqueueEvent(config, queue, event("unload-1", "u".repeat(8_000)));
  enqueueEvent(config, queue, event("unload-2", "u".repeat(8_000)));
  await flushQueue(config, queue, true);

  assert.ok(requestSizes.every((size) => size <= MAX_KEEPALIVE_REQUEST_BYTES));
  assert.ok(MAX_ANALYTICS_REQUEST_BYTES > MAX_KEEPALIVE_REQUEST_BYTES);
  assert.ok(MAX_ANALYTICS_EVENT_BYTES > 0);
});

test("measures Unicode as UTF-8 bytes and keeps encrypted requests below 64 KiB", { concurrency: false }, async () => {
  const requestSizes: number[] = [];
  globalThis.fetch = async (_input, init) => {
    requestSizes.push(new TextEncoder().encode(String(init?.body ?? "")).byteLength);
    return response(204);
  };

  const queue: TrackedEvent[] = [];
  for (let index = 0; index < 25; index += 1) {
    enqueueEvent(config, queue, event(`unicode-${index}`, "😀漢字".repeat(200)));
  }

  await flushQueue(config, queue);

  assert.ok(requestSizes.length >= 1);
  assert.ok(requestSizes.every((size) => size <= MAX_ANALYTICS_REQUEST_BYTES));
  assert.ok(new TextEncoder().encode("😀漢字").byteLength > "😀漢字".length);
});

test("drops an individual event above the 16 KiB serialized limit", { concurrency: false }, async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return response(204);
  };

  const queue: TrackedEvent[] = [];
  enqueueEvent(config, queue, event("too-large", "x".repeat(MAX_ANALYTICS_EVENT_BYTES)));
  await flushQueue(config, queue);

  assert.equal(requests, 0);
  assert.equal(queue.length, 0);
});

test("bounds queue count and serialized memory with oldest-first overflow", { concurrency: false }, () => {
  const queue: TrackedEvent[] = [];
  for (let index = 0; index < MAX_ANALYTICS_QUEUE_EVENTS + 20; index += 1) {
    enqueueEvent(config, queue, event(`overflow-${index}`));
  }

  assert.equal(queue.length, MAX_ANALYTICS_QUEUE_EVENTS);
  assert.equal(queue[0]?.eventId, "overflow-20");
  assert.ok(
    queue.reduce((total, current) => total + new TextEncoder().encode(JSON.stringify(current)).byteLength, 0) <=
      MAX_ANALYTICS_QUEUE_BYTES
  );
});

test("stops retrying after bounded transient failures", { concurrency: false }, async () => {
  const originalSetTimeout = window.setTimeout;
  let requests = 0;
  window.setTimeout = ((callback: () => void) => {
    callback();
    return 0 as unknown as number;
  }) as typeof window.setTimeout;
  globalThis.fetch = async () => {
    requests += 1;
    if (requests === 1) throw new Error("network unavailable");
    return response(503);
  };

  try {
    const queue: TrackedEvent[] = [];
    enqueueEvent(config, queue, event("retry-exhausted"));
    await flushQueue(config, queue);
    assert.equal(requests, 5);
    assert.equal(queue.length, 0);
  } finally {
    window.setTimeout = originalSetTimeout;
  }
});
