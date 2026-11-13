import type { ReplayEvent, TrackerReplayChunk } from "@workspace/contracts";
import { record } from "rrweb";
import type { PathLensConfig } from "@workspace/contracts/tracker";
import {
  postPreparedEncryptedPayload,
  prepareEncryptedPayload,
  type PreparedEncryptedPayload,
} from "./crypto";

const REPLAY_CHECKOUT_INTERVAL = 60_000;
const REPLAY_MAX_EVENTS_PER_CHUNK = 100;
const REPLAY_MAX_REQUEST_BYTES = 64 * 1024;
const REPLAY_MAX_KEEPALIVE_BYTES = 32 * 1024;
const REPLAY_MAX_QUEUE_EVENTS = 5_000;
const REPLAY_MAX_QUEUE_BYTES = 2 * 1024 * 1024;
const REPLAY_MAX_RETRY_ATTEMPTS = 5;
const REPLAY_MAX_RETRY_AGE_MS = 15 * 60 * 1000;
const REPLAY_RETRY_BASE_MS = 500;
const REPLAY_RETRY_MAX_MS = 30_000;
const REPLAY_ESTIMATE_RATIO = 0.68;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

interface ReplayRecorderOptions {
  config: PathLensConfig;
  sessionId: string;
  visitorId: string;
}

interface PendingChunk {
  chunk: TrackerReplayChunk;
  attempts: number;
  firstRetryAt?: number;
}

interface KeepaliveBudget {
  usedBytes: number;
}

type SendResult =
  | { kind: "sent" }
  | { kind: "split" }
  | { kind: "dropped" }
  | { kind: "budget" };

export const REPLAY_REQUEST_LIMIT_BYTES = REPLAY_MAX_REQUEST_BYTES;
export const REPLAY_KEEPALIVE_LIMIT_BYTES = REPLAY_MAX_KEEPALIVE_BYTES;

function redactEmail(value: string): string {
  return value.replace(EMAIL_PATTERN, (match) => "*".repeat(match.length));
}

function getDimensions() {
  return {
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}

function getLocation() {
  const location = new URL(window.location.href);
  location.search = "";
  location.hash = "";

  return {
    url: redactEmail(location.toString()).slice(0, 2048),
    path: redactEmail(location.pathname).slice(0, 2048),
  };
}

function serializedEventBytes(event: ReplayEvent): number {
  return new TextEncoder().encode(JSON.stringify(event)).byteLength;
}

function retryDelay(attempt: number): number {
  const base = Math.min(
    REPLAY_RETRY_MAX_MS,
    REPLAY_RETRY_BASE_MS * 2 ** Math.max(0, attempt - 1)
  );
  return Math.floor(base * (0.75 + Math.random() * 0.5));
}

function retryAfter(response: Response): number | undefined {
  const value = response.headers.get("Retry-After");
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(REPLAY_RETRY_MAX_MS, seconds * 1000);
  }

  const date = Date.parse(value);
  return Number.isNaN(date)
    ? undefined
    : Math.max(0, Math.min(REPLAY_RETRY_MAX_MS, date - Date.now()));
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export class ReplayRecorder {
  private readonly config: PathLensConfig;

  private readonly sessionId: string;

  private readonly visitorId: string;

  private readonly pendingEvents: ReplayEvent[] = [];

  private readonly pendingChunks: PendingChunk[] = [];

  private pendingEventBytes = 0;

  private nextSequence = 0;

  private stopRecording?: () => void;

  private flushTimer?: number;

  private flushChain: Promise<void> = Promise.resolve();

  private stopped = false;

  private finalFlushStarted = false;

  private recordingIncomplete = false;

  constructor({ config, sessionId, visitorId }: ReplayRecorderOptions) {
    this.config = config;
    this.sessionId = sessionId;
    this.visitorId = visitorId;
  }

  start(): void {
    if (this.stopRecording) return;

    this.stopRecording = record<ReplayEvent>({
      emit: (event) => this.enqueue(event),
      blockClass: "pathlens-replay-block",
      blockSelector: "[data-pathlens-block]",
      maskAllInputs: true,
      maskTextSelector: "[data-pathlens-mask]",
      inlineStylesheet: true,
      collectFonts: true,
      recordCanvas: false,
      recordCrossOriginIframes: false,
      checkoutEveryNms: REPLAY_CHECKOUT_INTERVAL,
      mousemoveWait: 100,
    });

    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.config.replayFlushInterval ?? 1_500);
  }

  stop(): void {
    if (this.stopped) return;

    this.stopped = true;
    this.stopRecording?.();

    if (this.flushTimer) {
      window.clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    this.flush(true);
  }

  private diagnose(
    reason: string,
    chunk?: TrackerReplayChunk,
    extra: Record<string, unknown> = {}
  ): void {
    console.warn("[Pathlens] replay_ingestion_diagnostic", {
      endpoint: "replay",
      eventTypes: chunk
        ? [...new Set(chunk.events.map((event) => event.type))].slice(0, 10)
        : [],
      eventCount: chunk?.events.length ?? 0,
      sequence: chunk?.sequence,
      retryCount:
        chunk === undefined
          ? 0
          : this.pendingChunks.find((item) => item.chunk === chunk)?.attempts ?? 0,
      reason,
      ...extra,
    });
  }

  private queueBytes(): number {
    return this.pendingEventBytes;
  }

  private enqueue(event: ReplayEvent): void {
    if (this.stopped) return;

    this.pendingEvents.push(event);
    this.pendingEventBytes += serializedEventBytes(event);

    while (
      this.pendingEvents.length > REPLAY_MAX_QUEUE_EVENTS ||
      this.queueBytes() > REPLAY_MAX_QUEUE_BYTES
    ) {
      const dropped = this.pendingEvents.shift();
      if (dropped) this.pendingEventBytes -= serializedEventBytes(dropped);
      this.recordingIncomplete = true;
      this.diagnose("queue_overflow", undefined, {
        queueEventCount: this.pendingEvents.length,
        queueBytes: this.queueBytes(),
      });
    }

    if (this.pendingEvents.length >= (this.config.replayBatchSize ?? 100)) {
      this.flush();
    }
  }

  private flush(isFinal = false): void {
    if (isFinal) {
      if (this.finalFlushStarted) return;
      this.finalFlushStarted = true;
    }

    this.flushChain = this.flushChain.then(() =>
      this.flushPendingEvents(isFinal)
    );
  }

  private async createNextChunk(
    isFinal: boolean,
    maxCandidateEvents = Number.POSITIVE_INFINITY
  ): Promise<PendingChunk | undefined> {
    if (this.pendingEvents.length === 0) return undefined;

    const maxEvents = Math.min(
      this.config.replayBatchSize ?? REPLAY_MAX_EVENTS_PER_CHUNK,
      REPLAY_MAX_EVENTS_PER_CHUNK,
      maxCandidateEvents
    );
    const estimateLimit = Math.floor(
      REPLAY_MAX_REQUEST_BYTES * REPLAY_ESTIMATE_RATIO
    );
    let count = Math.min(maxEvents, this.pendingEvents.length);
    let estimatedBytes = 2;

    for (let index = 0; index < count; index += 1) {
      estimatedBytes += serializedEventBytes(this.pendingEvents[index]!) + 1;
      if (estimatedBytes > estimateLimit) {
        count = Math.max(1, index);
        break;
      }
    }

    const events = this.pendingEvents.slice(0, count);
    const chunk: TrackerReplayChunk = {
      sessionId: this.sessionId,
      visitorId: this.visitorId,
      sequence: this.nextSequence,
      events,
      ...getDimensions(),
      ...getLocation(),
    };

    let prepared: PreparedEncryptedPayload;
    try {
      prepared = await prepareEncryptedPayload(chunk, this.config.apiKey);
    } catch {
      this.pendingEvents.splice(0, events.length);
      this.pendingEventBytes -= events.reduce(
        (total, event) => total + serializedEventBytes(event),
        0
      );
      this.recordingIncomplete = true;
      this.diagnose("serialization_failure", chunk);
      return undefined;
    }

    if (prepared.byteLength > REPLAY_MAX_REQUEST_BYTES && events.length > 1) {
      return this.createNextChunk(
        isFinal,
        Math.max(1, Math.floor(events.length / 2))
      );
    }

    this.pendingEvents.splice(0, events.length);
    this.pendingEventBytes -= events.reduce(
      (total, event) => total + serializedEventBytes(event),
      0
    );
    if (prepared.byteLength > REPLAY_MAX_REQUEST_BYTES) {
      this.recordingIncomplete = true;
      this.diagnose("snapshot_too_large", chunk, {
        serializedBytes: prepared.byteLength,
        maxRequestBytes: REPLAY_MAX_REQUEST_BYTES,
      });
      return undefined;
    }

    this.nextSequence += 1;
    return { chunk, attempts: 0 };
  }

  private splitPendingChunk(index: number): void {
    const pending = this.pendingChunks[index];
    if (!pending || pending.chunk.events.length < 2) return;

    const midpoint = Math.ceil(pending.chunk.events.length / 2);
    const left: PendingChunk = {
      ...pending,
      chunk: {
        ...pending.chunk,
        events: pending.chunk.events.slice(0, midpoint),
        isFinal: false,
      },
    };
    const right: PendingChunk = {
      attempts: 0,
      chunk: {
        ...pending.chunk,
        sequence: pending.chunk.sequence + 1,
        events: pending.chunk.events.slice(midpoint),
        ...(pending.chunk.isFinal ? { isFinal: true } : { isFinal: undefined }),
      },
    };

    for (let next = index + 1; next < this.pendingChunks.length; next += 1) {
      this.pendingChunks[next]!.chunk.sequence += 1;
    }
    this.nextSequence += 1;
    this.pendingChunks.splice(index, 1, left, right);
    this.diagnose("http_413_split", pending.chunk, {
      status: 413,
    });
  }

  private async sendChunk(
    pending: PendingChunk,
    keepalive: boolean,
    budget: KeepaliveBudget
  ): Promise<SendResult> {
    let prepared: PreparedEncryptedPayload;

    try {
      prepared = await prepareEncryptedPayload(pending.chunk, this.config.apiKey);
    } catch {
      this.recordingIncomplete = true;
      this.diagnose("serialization_failure", pending.chunk);
      return { kind: "dropped" };
    }

    const limit = keepalive ? REPLAY_MAX_KEEPALIVE_BYTES : REPLAY_MAX_REQUEST_BYTES;
    if (prepared.byteLength > limit) {
      if (pending.chunk.events.length > 1) return { kind: "split" };
      this.recordingIncomplete = true;
      this.diagnose("single_event_too_large", pending.chunk, {
        serializedBytes: prepared.byteLength,
        maxRequestBytes: limit,
      });
      return { kind: "dropped" };
    }

    if (keepalive && budget.usedBytes + prepared.byteLength > limit) {
      this.recordingIncomplete = true;
      this.diagnose("keepalive_budget_exceeded", pending.chunk, {
        serializedBytes: prepared.byteLength,
        maxKeepaliveBytes: limit,
      });
      return { kind: "budget" };
    }

    if (keepalive) budget.usedBytes += prepared.byteLength;

    let response: Response | undefined;
    try {
      response = await postPreparedEncryptedPayload(
        this.config.replayApiUrl,
        this.config.apiKey,
        prepared,
        keepalive
      );
    } catch {
      response = undefined;
    }

    if (response && response.status >= 200 && response.status < 300) {
      return { kind: "sent" };
    }

    if (response?.status === 413) {
      if (pending.chunk.events.length > 1) return { kind: "split" };
      this.recordingIncomplete = true;
      this.diagnose("single_event_413", pending.chunk, { status: 413 });
      return { kind: "dropped" };
    }

    if (response?.status === 400 || response?.status === 422) {
      this.recordingIncomplete = true;
      this.diagnose("permanent_validation_failure", pending.chunk, {
        status: response.status,
      });
      return { kind: "dropped" };
    }

    if (response?.status === 401 || response?.status === 403) {
      this.recordingIncomplete = true;
      this.diagnose("authorization_failure", pending.chunk, {
        status: response.status,
      });
      return { kind: "dropped" };
    }

    pending.attempts += 1;
    pending.firstRetryAt ??= Date.now();
    if (
      pending.attempts >= REPLAY_MAX_RETRY_ATTEMPTS ||
      Date.now() - pending.firstRetryAt >= REPLAY_MAX_RETRY_AGE_MS
    ) {
      this.recordingIncomplete = true;
      this.diagnose("retry_exhausted", pending.chunk, {
        status: response?.status || "network",
      });
      return { kind: "dropped" };
    }

    const delay =
      response?.status === 429
        ? retryAfter(response) ?? retryDelay(pending.attempts)
        : retryDelay(pending.attempts);
    this.diagnose("retry_scheduled", pending.chunk, {
      status: response?.status || "network",
      delayMs: delay,
    });
    await sleep(delay);
    return this.sendChunk(pending, keepalive, budget);
  }

  private async flushPendingEvents(isFinal: boolean): Promise<void> {
    while (this.pendingEvents.length > 0) {
      const chunk = await this.createNextChunk(isFinal);
      if (chunk) this.pendingChunks.push(chunk);
    }

    if (isFinal && this.pendingChunks.length > 0) {
      const last = this.pendingChunks[this.pendingChunks.length - 1]!;
      last.chunk.isFinal = true;
    }

    const budget: KeepaliveBudget = { usedBytes: 0 };
    const keepalive = isFinal;

    while (this.pendingChunks.length > 0) {
      const pending = this.pendingChunks[0]!;
      const result = await this.sendChunk(pending, keepalive, budget);

      if (result.kind === "split") {
        this.splitPendingChunk(0);
        continue;
      }

      this.pendingChunks.shift();
      if (result.kind === "budget") break;
    }

    if (isFinal && this.recordingIncomplete) {
      this.diagnose("recording_incomplete");
    }
  }
}
