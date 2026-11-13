// src/utils.ts

import { normalizePagePath } from "@workspace/contracts";
import type {
  CampaignAttribution,
  ClientAnalyticsInfo,
  DeviceType,
  PathLensConfig,
  TrackingScope,
  TrackedEvent,
} from "@workspace/contracts/tracker";
import {
  postPreparedEncryptedPayload,
  prepareEncryptedPayload,
  utf8ByteLength,
  type PreparedEncryptedPayload,
} from "./crypto";

const VISITOR_KEY = "pathlens_visitor";
const SESSION_KEY = "pathlens_session";
const SESSION_LAST_ACTIVE_KEY = "pathlens_session_last_active";
const CAMPAIGN_KEY_PREFIX = "pathlens_campaign:";
const CAMPAIGN_VALUE_LIMIT = 512;
const SESSION_TIMEOUT = 30 * 60 * 1000;
export const MAX_ANALYTICS_BATCH_EVENTS = 25;
export const MAX_ANALYTICS_REQUEST_BYTES = 64 * 1024;
export const MAX_ANALYTICS_EVENT_BYTES = 16 * 1024;
export const MAX_KEEPALIVE_REQUEST_BYTES = 32 * 1024;
export const MAX_ANALYTICS_QUEUE_EVENTS = 500;
export const MAX_ANALYTICS_QUEUE_BYTES = 512 * 1024;
export const MAX_ANALYTICS_RETRY_ATTEMPTS = 5;
export const MAX_ANALYTICS_RETRY_AGE_MS = 15 * 60 * 1000;
const PLAINTEXT_BATCH_ESTIMATE_RATIO = 0.68;
const RETRY_BASE_DELAY_MS = 500;
const RETRY_MAX_DELAY_MS = 30_000;
const DEFAULT_API_URL =
  process.env.API_URL ??
  "https://t1xg2ok5i0.execute-api.ap-south-1.amazonaws.com/dev/api/events";
const DEFAULT_REPLAY_API_URL =
  process.env.REPLAY_API_URL ??
  "https://t1xg2ok5i0.execute-api.ap-south-1.amazonaws.com/dev/api/replay/chunks";

export function createVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, id);
  }

  return id;
}

export function createSessionId(): string {
  try {
    const storage = window.sessionStorage;
    const existingId = storage.getItem(SESSION_KEY);
    const lastActive = Number(storage.getItem(SESSION_LAST_ACTIVE_KEY) ?? "0");

    if (existingId && Date.now() - lastActive < SESSION_TIMEOUT) {
      return existingId;
    }

    const id = crypto.randomUUID();
    storage.setItem(SESSION_KEY, id);
    storage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function touchSession(): void {
  try {
    window.sessionStorage.setItem(SESSION_LAST_ACTIVE_KEY, String(Date.now()));
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

function normalizeCampaignValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;

  const normalized = value.trim().slice(0, CAMPAIGN_VALUE_LIMIT);

  return normalized || undefined;
}

function getCampaignFromSearch(search: string): CampaignAttribution {
  const params = new URLSearchParams(search);
  const attribution: CampaignAttribution = {};
  const values = {
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmTerm: params.get("utm_term"),
    utmContent: params.get("utm_content"),
  };

  for (const [key, value] of Object.entries(values)) {
    const normalized = normalizeCampaignValue(value);

    if (normalized) {
      attribution[key as keyof CampaignAttribution] = normalized;
    }
  }

  return attribution;
}

function getStoredCampaign(value: string | null): CampaignAttribution {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const attribution: CampaignAttribution = {};

    for (const key of [
      "utmSource",
      "utmMedium",
      "utmCampaign",
      "utmTerm",
      "utmContent",
    ] as const) {
      const normalized = normalizeCampaignValue(parsed[key]);

      if (normalized) attribution[key] = normalized;
    }

    return attribution;
  } catch {
    return {};
  }
}

export function getCampaignAttribution(projectId: string): CampaignAttribution {
  const storageKey = `${CAMPAIGN_KEY_PREFIX}${projectId}`;

  try {
    const stored = getStoredCampaign(localStorage.getItem(storageKey));

    if (Object.keys(stored).length > 0) return stored;
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }

  const current = getCampaignFromSearch(window.location.search);

  if (Object.keys(current).length > 0) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(current));
    } catch {
      // Storage may be unavailable in privacy-restricted browser contexts.
    }
  }

  return current;
}

export function now(): string {
  return new Date().toISOString();
}

export function getPageInfo() {
  const favicon = document.querySelector<HTMLLinkElement>(
    'link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]'
  );

  return {
    url: location.href,
    path: normalizePagePath(location.pathname),
    title: document.title,
    faviconUrl: favicon?.href ?? new URL("/favicon.ico", location.origin).href,
  };
}

function getVersion(userAgent: string, pattern: RegExp): string | null {
  return userAgent.match(pattern)?.[1] ?? null;
}

function getDeviceType(userAgent: string): DeviceType {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(userAgent)) {
    return "tablet";
  }

  if (/Mobi|Android|iPhone|iPod/i.test(userAgent)) {
    return "mobile";
  }

  if (userAgent) {
    return "desktop";
  }

  return "unknown";
}

function getBrowser(userAgent: string) {
  if (/Edg\//i.test(userAgent)) {
    return {
      name: "Edge",
      version: getVersion(userAgent, /Edg\/([\d.]+)/i),
    };
  }

  if (/OPR\//i.test(userAgent)) {
    return {
      name: "Opera",
      version: getVersion(userAgent, /OPR\/([\d.]+)/i),
    };
  }

  if (/Chrome\//i.test(userAgent)) {
    return {
      name: "Chrome",
      version: getVersion(userAgent, /Chrome\/([\d.]+)/i),
    };
  }

  if (/Firefox\//i.test(userAgent)) {
    return {
      name: "Firefox",
      version: getVersion(userAgent, /Firefox\/([\d.]+)/i),
    };
  }

  if (/Safari\//i.test(userAgent)) {
    return {
      name: "Safari",
      version: getVersion(userAgent, /Version\/([\d.]+)/i),
    };
  }

  return {
    name: "Other",
    version: null,
  };
}

function getOperatingSystem(userAgent: string) {
  if (/Windows NT/i.test(userAgent)) {
    return {
      name: "Windows",
      version: getVersion(userAgent, /Windows NT ([\d.]+)/i),
    };
  }

  if (/Android/i.test(userAgent)) {
    return {
      name: "Android",
      version: getVersion(userAgent, /Android ([\d.]+)/i),
    };
  }

  if (/(iPhone|iPad|iPod)/i.test(userAgent)) {
    return {
      name: "iOS",
      version:
        getVersion(userAgent, /OS ([\d_]+)/i)?.replace(/_/g, ".") ?? null,
    };
  }

  if (/Mac OS X/i.test(userAgent)) {
    return {
      name: "macOS",
      version:
        getVersion(userAgent, /Mac OS X ([\d_]+)/i)?.replace(/_/g, ".") ?? null,
    };
  }

  if (/Linux/i.test(userAgent)) {
    return {
      name: "Linux",
      version: null,
    };
  }

  return {
    name: "Other",
    version: null,
  };
}

function getCountryCode(): string | undefined {
  const locales = [navigator.language, ...navigator.languages];

  for (const locale of locales) {
    const match = locale.match(/[-_]([A-Za-z]{2})$/);

    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  return undefined;
}

export function getAnalyticsInfo(): ClientAnalyticsInfo {
  const userAgent = navigator.userAgent;
  const browser = getBrowser(userAgent);
  const operatingSystem = getOperatingSystem(userAgent);

  return {
    device: getDeviceType(userAgent),
    browser: browser.name,
    browserVersion: browser.version,
    os: operatingSystem.name,
    osVersion: operatingSystem.version,
    countryCode: getCountryCode(),
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent,
    referrer: document.referrer,
  };
}

export function throttle<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): T {
  let lastRun = 0;

  return ((...args: Parameters<T>) => {
    const current = Date.now();

    if (current - lastRun < delay) return;

    lastRun = current;

    fn(...args);
  }) as T;
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  delay: number
): T {
  let timeout: number | undefined;

  return ((...args: Parameters<T>) => {
    window.clearTimeout(timeout);

    timeout = window.setTimeout(() => {
      fn(...args);
    }, delay);
  }) as T;
}

export function debug(
  config: PathLensConfig,
  message: string,
  ...args: unknown[]
) {
  if (!config.debug) return;

  console.log(`[Pathlens] ${message}`, ...args);
}

interface RetryState {
  attempts: number;
  firstAttemptAt: number;
}

interface AnalyticsQueueState {
  inFlight: Set<TrackedEvent>;
  retries: WeakMap<TrackedEvent, RetryState>;
  worker?: Promise<void>;
  finalFlushStarted: boolean;
  keepaliveBytesSent: number;
}

const queueStates = new WeakMap<TrackedEvent[], AnalyticsQueueState>();
const eventRetryStates = new WeakMap<TrackedEvent, RetryState>();

function getQueueState(queue: TrackedEvent[]): AnalyticsQueueState {
  let state = queueStates.get(queue);

  if (!state) {
    state = {
      inFlight: new Set(),
      retries: new WeakMap(),
      finalFlushStarted: false,
      keepaliveBytesSent: 0,
    };
    queueStates.set(queue, state);
  }

  return state;
}

function eventBytes(event: TrackedEvent): number {
  return utf8ByteLength(JSON.stringify(event));
}

function queueBytes(queue: TrackedEvent[]): number {
  return queue.reduce((total, event) => total + eventBytes(event), 0);
}

function diagnostic(
  reason: string,
  config: PathLensConfig,
  events: TrackedEvent[],
  extra: Record<string, unknown> = {}
): void {
  const metadata = {
    endpoint: "analytics",
    eventTypes: [...new Set(events.map((event) => event.type))].slice(0, 10),
    eventCount: events.length,
    retryCount: Math.max(
      0,
      ...events.map((event) => getQueueStateForEvent(event)?.attempts ?? 0)
    ),
    reason,
    ...extra,
  };

  console.warn("[Pathlens] ingestion_diagnostic", metadata);
}

function getQueueStateForEvent(event: TrackedEvent): RetryState | undefined {
  return eventRetryStates.get(event);
}

function removeEvent(queue: TrackedEvent[], event: TrackedEvent): void {
  const index = queue.indexOf(event);
  if (index >= 0) queue.splice(index, 1);
}

/**
 * Adds an event to the bounded analytics queue. Overflow drops the oldest
 * event that is not currently in flight, preserving the newest data while
 * preventing failed networks from growing browser memory without bound.
 */
export function enqueueEvent(
  config: PathLensConfig,
  queue: TrackedEvent[],
  event: TrackedEvent
): void {
  const state = getQueueState(queue);
  queue.push(event);

  while (
    queue.length > MAX_ANALYTICS_QUEUE_EVENTS ||
    queueBytes(queue) > MAX_ANALYTICS_QUEUE_BYTES
  ) {
    const dropIndex = queue.findIndex((candidate) => !state.inFlight.has(candidate));
    if (dropIndex < 0) break;

    const [dropped] = queue.splice(dropIndex, 1);
    if (dropped) {
      state.retries.delete(dropped);
      eventRetryStates.delete(dropped);
      diagnostic("queue_overflow", config, [dropped], {
        queueEventCount: queue.length,
        queueBytes: queueBytes(queue),
      });
    }
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function getRetryDelay(attempt: number): number {
  const exponential = Math.min(
    RETRY_MAX_DELAY_MS,
    RETRY_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1)
  );
  return Math.floor(exponential * (0.75 + Math.random() * 0.5));
}

function getRetryAfter(response: Response): number | undefined {
  const value = response.headers.get("Retry-After");
  if (!value) return undefined;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(RETRY_MAX_DELAY_MS, seconds * 1000);
  }

  const date = Date.parse(value);
  if (!Number.isNaN(date)) return Math.max(0, Math.min(RETRY_MAX_DELAY_MS, date - Date.now()));

  return undefined;
}

function markAcknowledged(
  queue: TrackedEvent[],
  state: AnalyticsQueueState,
  events: TrackedEvent[]
): void {
  for (const event of events) {
    state.inFlight.delete(event);
    state.retries.delete(event);
    eventRetryStates.delete(event);
    removeEvent(queue, event);
  }
}

function markRetryable(
  state: AnalyticsQueueState,
  events: TrackedEvent[]
): RetryState | undefined {
  let highest: RetryState | undefined;
  const nowMs = Date.now();

  for (const event of events) {
    const current = state.retries.get(event) ?? {
      attempts: 0,
      firstAttemptAt: nowMs,
    };
    current.attempts += 1;
    state.retries.set(event, current);
    eventRetryStates.set(event, current);
    if (!highest || current.attempts > highest.attempts) highest = current;
  }

  return highest;
}

function retryAllowed(
  state: AnalyticsQueueState,
  events: TrackedEvent[]
): boolean {
  const nowMs = Date.now();
  return events.every((event) => {
    const retry = state.retries.get(event);
    return (
      !retry ||
      (retry.attempts < MAX_ANALYTICS_RETRY_ATTEMPTS &&
        nowMs - retry.firstAttemptAt < MAX_ANALYTICS_RETRY_AGE_MS)
    );
  });
}

function selectBatch(
  config: PathLensConfig,
  queue: TrackedEvent[],
  state: AnalyticsQueueState,
  maxRequestBytes: number
): TrackedEvent[] {
  const batch: TrackedEvent[] = [];
  const estimateLimit = Math.floor(maxRequestBytes * PLAINTEXT_BATCH_ESTIMATE_RATIO);
  let estimatedBytes = 2;

  for (const event of [...queue]) {
    if (state.inFlight.has(event)) continue;

    const bytes = eventBytes(event);
    if (bytes > MAX_ANALYTICS_EVENT_BYTES) {
      removeEvent(queue, event);
      diagnostic("event_too_large", config, [event], {
        serializedBytes: bytes,
        maxEventBytes: MAX_ANALYTICS_EVENT_BYTES,
      });
      continue;
    }

    if (
      batch.length >= MAX_ANALYTICS_BATCH_EVENTS ||
      (batch.length > 0 && estimatedBytes + bytes + 1 > estimateLimit)
    ) {
      break;
    }

    batch.push(event);
    estimatedBytes += bytes + 1;
  }

  for (const event of batch) state.inFlight.add(event);
  return batch;
}

async function sendPreparedBatch(
  config: PathLensConfig,
  queue: TrackedEvent[],
  state: AnalyticsQueueState,
  events: TrackedEvent[],
  keepalive: boolean,
  maxRequestBytes: number
): Promise<void> {
  let prepared: PreparedEncryptedPayload;

  try {
    prepared = await prepareEncryptedPayload(events, config.apiKey);
  } catch {
    markAcknowledged(queue, state, events);
    diagnostic("serialization_failure", config, events);
    return;
  }

  if (prepared.byteLength > maxRequestBytes) {
    if (events.length === 1) {
      markAcknowledged(queue, state, events);
      diagnostic("event_request_too_large", config, events, {
        serializedBytes: prepared.byteLength,
        maxRequestBytes,
      });
      return;
    }

    const midpoint = Math.ceil(events.length / 2);
    const left = events.slice(0, midpoint);
    const right = events.slice(midpoint);
    diagnostic("batch_split", config, events, {
      serializedBytes: prepared.byteLength,
      maxRequestBytes,
    });
    await sendPreparedBatch(config, queue, state, left, keepalive, maxRequestBytes);
    await sendPreparedBatch(config, queue, state, right, keepalive, maxRequestBytes);
    return;
  }

  if (
    keepalive &&
    state.keepaliveBytesSent + prepared.byteLength > MAX_KEEPALIVE_REQUEST_BYTES
  ) {
    markAcknowledged(queue, state, events);
    diagnostic("keepalive_budget_exceeded", config, events, {
      serializedBytes: prepared.byteLength,
      maxKeepaliveBytes: MAX_KEEPALIVE_REQUEST_BYTES,
    });
    return;
  }

  if (keepalive) state.keepaliveBytesSent += prepared.byteLength;

  let response: Response | undefined;
  try {
    response = await postPreparedEncryptedPayload(
      config.apiUrl,
      config.apiKey,
      prepared,
      keepalive
    );
  } catch {
    response = undefined;
  }

  if (response && response.status >= 200 && response.status < 300) {
    markAcknowledged(queue, state, events);
    return;
  }

  if (response?.status === 413) {
    if (events.length === 1) {
      markAcknowledged(queue, state, events);
      diagnostic("single_event_413", config, events, { status: 413 });
      return;
    }

    const midpoint = Math.ceil(events.length / 2);
    diagnostic("http_413_split", config, events, {
      status: 413,
      serializedBytes: prepared.byteLength,
    });
    await sendPreparedBatch(config, queue, state, events.slice(0, midpoint), keepalive, maxRequestBytes);
    await sendPreparedBatch(config, queue, state, events.slice(midpoint), keepalive, maxRequestBytes);
    return;
  }

  if (response?.status === 400 || response?.status === 422) {
    markAcknowledged(queue, state, events);
    diagnostic("permanent_validation_failure", config, events, {
      status: response.status,
    });
    return;
  }

  if (response?.status === 401 || response?.status === 403) {
    markAcknowledged(queue, state, events);
    diagnostic("authorization_failure", config, events, {
      status: response.status,
    });
    return;
  }

  const retry = markRetryable(state, events);
  if (!retryAllowed(state, events)) {
    markAcknowledged(queue, state, events);
    diagnostic("retry_exhausted", config, events, {
      status: response?.status || "network",
    });
    return;
  }

  const delay =
    response?.status === 429
      ? getRetryAfter(response) ?? getRetryDelay(retry?.attempts ?? 1)
      : getRetryDelay(retry?.attempts ?? 1);
  diagnostic("retry_scheduled", config, events, {
    status: response?.status || "network",
    delayMs: delay,
  });
  await sleep(delay);
  await sendPreparedBatch(
    config,
    queue,
    state,
    events,
    keepalive,
    maxRequestBytes
  );
}

async function runQueue(
  config: PathLensConfig,
  queue: TrackedEvent[],
  state: AnalyticsQueueState,
  keepalive: boolean
): Promise<void> {
  const maxRequestBytes = keepalive
    ? MAX_KEEPALIVE_REQUEST_BYTES
    : MAX_ANALYTICS_REQUEST_BYTES;

  while (true) {
    const batch = selectBatch(config, queue, state, maxRequestBytes);
    if (batch.length === 0) return;

    await sendPreparedBatch(
      config,
      queue,
      state,
      batch,
      keepalive,
      maxRequestBytes
    );

    // A final keepalive flush is deliberately limited to one selected batch.
    // Browser shutdown does not provide guaranteed delivery for later batches.
    if (keepalive) return;
  }
}

export function flushQueue(
  config: PathLensConfig,
  queue: TrackedEvent[],
  keepalive = false
): Promise<void> {
  const state = getQueueState(queue);
  if (keepalive && state.finalFlushStarted) return Promise.resolve();
  if (keepalive) state.finalFlushStarted = true;
  if (state.worker) return state.worker;
  if (queue.length === 0) return Promise.resolve();

  state.worker = runQueue(config, queue, state, keepalive).finally(() => {
    state.worker = undefined;
  });

  return state.worker;
}

export function readConfig(): PathLensConfig {
  const script = document.currentScript as HTMLScriptElement | null;

  if (!script) {
    throw new Error("Pathlens: Unable to locate current script.");
  }

  const dataset = script.dataset;

  if (!dataset.apiKey) {
    throw new Error("Pathlens: data-api-key is required.");
  }

  return {
    apiKey: dataset.apiKey,
    apiUrl: DEFAULT_API_URL,
    trackingScopes: [],
    replayApiUrl: DEFAULT_REPLAY_API_URL,
    replayFlushInterval: Number(dataset.replayFlushInterval ?? 1500),
    replayBatchSize: Number(dataset.replayBatchSize ?? 100),

    debug: dataset.debug === "true",

    captureClicks: dataset.captureClicks !== "false",
    captureScroll: dataset.captureScroll !== "false",
    captureMouseMove: dataset.captureMouseMove !== "false",
    captureResize: dataset.captureResize !== "false",
    captureForms: dataset.captureForms !== "false",
    captureInputs: dataset.captureInputs !== "false",
    captureErrors: dataset.captureErrors !== "false",
    capturePerformance: dataset.capturePerformance !== "false",
    captureNavigation: dataset.captureNavigation !== "false",

    flushInterval: Number(dataset.flushInterval ?? 5000),
    batchSize: Number(dataset.batchSize ?? 25),
  };
}

export async function fetchTrackingScopes(
  config: PathLensConfig
): Promise<TrackingScope[]> {
  const configUrl = new URL(config.apiUrl, window.location.href);

  if (configUrl.pathname.endsWith("/events")) {
    configUrl.pathname = configUrl.pathname.slice(0, -"/events".length);
  }

  configUrl.pathname = `${configUrl.pathname.replace(/\/$/, "")}/tracking/config`;

  const response = await fetch(configUrl, {
    headers: {
      "X-Project-Key": config.apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Tracking configuration failed with status ${response.status}`
    );
  }

  const result = (await response.json()) as {
    success?: boolean;
    data?: { scopes?: unknown };
  };
  const scopes = result.data?.scopes;

  if (!result.success || !Array.isArray(scopes) || scopes.length === 0) {
    throw new Error("Tracking configuration is invalid.");
  }

  const validScopes = scopes.filter(
    (scope): scope is TrackingScope =>
      scope === "events" ||
      scope === "replay" ||
      scope === "errors" ||
      scope === "performance"
  );

  if (validScopes.length === 0) {
    throw new Error("Tracking configuration has no valid scopes.");
  }

  return validScopes;
}
