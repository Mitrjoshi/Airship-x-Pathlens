import type { ReplayChunk, ReplayEvent } from "@workspace/contracts";

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const SENSITIVE_TEXT_KEYS = new Set([
  "authorization",
  "cookie",
  "email",
  "password",
  "secret",
  "token",
  "value",
]);
const URL_KEYS = new Set(["href", "path", "referrer", "src", "url"]);

function stripUrlDetails(value: string): string {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value.split(/[?#]/, 1)[0] ?? value;
  }
}

function sanitizeString(value: string, key?: string): string {
  if (key && SENSITIVE_TEXT_KEYS.has(key)) return "*".repeat(value.length);

  const sanitized = key && URL_KEYS.has(key) ? stripUrlDetails(value) : value;

  return sanitized.replace(EMAIL_PATTERN, (match) => "*".repeat(match.length));
}

export function sanitizeReplayValue(value: unknown, key?: string): unknown {
  if (typeof value === "string") return sanitizeString(value, key);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeReplayValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeReplayValue(entryValue, entryKey),
      ])
    );
  }

  return value;
}

export function sanitizeReplayEvent(event: ReplayEvent): ReplayEvent {
  return sanitizeReplayValue(event) as ReplayEvent;
}

export function sanitizeReplayEvents(events: ReplayEvent[]): ReplayEvent[] {
  return events.map(sanitizeReplayEvent);
}

export function sanitizeReplayChunk(chunk: ReplayChunk): ReplayChunk {
  return {
    ...chunk,
    events: sanitizeReplayEvents(chunk.events),
    ...(chunk.url ? { url: sanitizeString(chunk.url, "url") } : {}),
    ...(chunk.path ? { path: sanitizeString(chunk.path, "path") } : {}),
  };
}
