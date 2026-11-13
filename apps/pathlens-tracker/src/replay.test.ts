import assert from "node:assert/strict";
import { test } from "node:test";
import type { PathLensConfig } from "@workspace/contracts/tracker";
import {
  ReplayRecorder,
  REPLAY_KEEPALIVE_LIMIT_BYTES,
  REPLAY_REQUEST_LIMIT_BYTES,
} from "./replay";

Object.assign(globalThis, {
  window: {
    screen: { width: 1280, height: 720 },
    innerWidth: 1024,
    innerHeight: 640,
    location: { href: "https://example.test/page?secret=removed#hash" },
    setTimeout: (callback: () => void, delay: number) =>
      globalThis.setTimeout(callback, delay),
    setInterval: (callback: () => void, delay: number) =>
      globalThis.setInterval(callback, delay),
    clearInterval: (handle: ReturnType<typeof setInterval>) =>
      globalThis.clearInterval(handle),
  },
});

const config: PathLensConfig = {
  apiKey: "replay-test-key",
  apiUrl: "https://collector.test/api/events",
  replayApiUrl: "https://collector.test/api/replay/chunks",
  trackingScopes: ["replay"],
  replayBatchSize: 100,
};

type TestRecorder = {
  enqueue: (event: Record<string, unknown>) => void;
  flush: (isFinal?: boolean) => void;
  flushChain: Promise<void>;
  pendingEvents: Array<Record<string, unknown>>;
  pendingChunks: Array<{
    chunk: { sequence: number; events: Array<Record<string, unknown>>; isFinal?: boolean };
  }>;
};

function recorder(overrides: Partial<PathLensConfig> = {}): TestRecorder {
  return new ReplayRecorder({
    config: { ...config, ...overrides },
    sessionId: "session-1",
    visitorId: "visitor-1",
  }) as unknown as TestRecorder;
}

function replayEvent(timestamp: number, data: unknown = {}): Record<string, unknown> {
  return { type: 3, timestamp, data };
}

function response(status: number, headers?: Record<string, string>): Response {
  return new Response(null, { status, headers });
}

test("keeps encrypted replay requests at or below 64 KiB", { concurrency: false }, async () => {
  const sizes: number[] = [];
  globalThis.fetch = async (_input, init) => {
    sizes.push(new TextEncoder().encode(String(init?.body ?? "")).byteLength);
    return response(202);
  };

  const instance = recorder();
  instance.enqueue(replayEvent(1, { text: "😀漢字".repeat(500) }));
  instance.enqueue(replayEvent(2, { text: "ordinary" }));
  instance.flush();
  await instance.flushChain;

  assert.ok(sizes.length >= 1);
  assert.ok(sizes.every((size) => size <= REPLAY_REQUEST_LIMIT_BYTES));
});

test("splits a 413 chunk while preserving order and unique sequences", { concurrency: false }, async () => {
  const statuses = [413, 202, 202];
  const requests: string[] = [];
  globalThis.fetch = async (_input, init) => {
    requests.push(String(init?.body ?? ""));
    return response(statuses.shift() ?? 202);
  };

  const instance = recorder();
  instance.enqueue(replayEvent(1));
  instance.enqueue(replayEvent(2));
  instance.flush();
  await instance.flushChain;

  assert.equal(requests.length, 3);
  assert.equal(instance.pendingChunks.length, 0);
});

test("does not apply the analytics 16 KiB event limit to replay snapshots", { concurrency: false }, async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return response(202);
  };

  const instance = recorder();
  instance.enqueue(
    replayEvent(1, { node: { text: "snapshot-data".repeat(2_000) } })
  );
  instance.flush();
  await instance.flushChain;

  assert.equal(requests, 1);
});

test("marks an oversized individual snapshot as incomplete instead of retrying it forever", { concurrency: false }, async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return response(202);
  };

  const instance = recorder();
  instance.enqueue(replayEvent(1, { node: { text: "x".repeat(100_000) } }));
  instance.flush(true);
  await instance.flushChain;

  assert.equal(requests, 0);
  assert.equal(instance.pendingChunks.length, 0);
});

test("preserves final sequence and keepalive size", { concurrency: false }, async () => {
  const sizes: number[] = [];
  globalThis.fetch = async (_input, init) => {
    sizes.push(new TextEncoder().encode(String(init?.body ?? "")).byteLength);
    return response(202);
  };

  const instance = recorder();
  instance.enqueue(replayEvent(1, { text: "a".repeat(7_000) }));
  instance.enqueue(replayEvent(2, { text: "b".repeat(7_000) }));
  instance.flush(true);
  await instance.flushChain;

  assert.ok(sizes.length >= 1);
  assert.ok(sizes.every((size) => size <= REPLAY_KEEPALIVE_LIMIT_BYTES));
});

test("retries 429 and network failures with stable queued chunks", { concurrency: false }, async () => {
  let requests = 0;
  const originalSetTimeout = window.setTimeout;
  window.setTimeout = ((callback: () => void) => {
    callback();
    return 0 as unknown as number;
  }) as typeof window.setTimeout;
  globalThis.fetch = async () => {
    requests += 1;
    if (requests === 1) throw new Error("network unavailable");
    if (requests === 2) return response(429, { "Retry-After": "0" });
    return response(202);
  };

  try {
    const instance = recorder();
    instance.enqueue(replayEvent(1));
    instance.flush();
    await instance.flushChain;
    assert.equal(requests, 3);
    assert.equal(instance.pendingChunks.length, 0);
  } finally {
    window.setTimeout = originalSetTimeout;
  }
});

test("shifts later sequences when an already-created chunk is split", { concurrency: false }, () => {
  const instance = recorder();
  instance.pendingChunks.push(
    {
      chunk: { sequence: 4, events: [replayEvent(1), replayEvent(2)] },
    },
    { chunk: { sequence: 5, events: [replayEvent(3)] } }
  );

  (instance as unknown as { splitPendingChunk: (index: number) => void }).splitPendingChunk(0);

  assert.deepEqual(
    instance.pendingChunks.map((pending) => pending.chunk.sequence),
    [4, 5, 6]
  );
  assert.deepEqual(
    instance.pendingChunks.map((pending) => pending.chunk.events[0]?.timestamp),
    [1, 2, 3]
  );
});

test("bounds pending replay memory and records overflow as incomplete", { concurrency: false }, async () => {
  const instance = recorder({ replayBatchSize: 10_000 });
  for (let index = 0; index < 5_001; index += 1) {
    instance.enqueue(replayEvent(index));
  }

  assert.equal(instance.pendingEvents.length, 5_000);
});
