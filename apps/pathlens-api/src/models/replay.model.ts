import { and, asc, eq, gt, sql } from "drizzle-orm";
import type { ReplayChunk, ReplayEvent } from "@workspace/contracts";
import { db } from "../db/client";
import { replayChunks, replaySessions } from "../db/schema";
import { getProjectIDByApiKeyModel } from "./projects.model";
import { publishReplayChunk } from "../lib/replay-live";

const REPLAY_CHUNK_LIMIT = 250;

export class InvalidReplayProjectKeyError extends Error {
  constructor() {
    super("Invalid project API key.");
    this.name = "InvalidReplayProjectKeyError";
  }
}

export interface ReplayData {
  available: boolean;
  events: ReplayEvent[];
  hasMoreEvents: boolean;
  lastSequence: number;
  isLive: boolean;
}

export interface ReplaySessionAccess {
  id: string;
  lastSequence: number;
  lastSeenAt: Date;
  endedAt: Date | null;
}

function getEventTimestamps(events: ReplayEvent[]): {
  first: Date;
  last: Date;
} {
  const timestamps = events.map((event) => event.timestamp);
  const firstTimestamp = Math.min(...timestamps);
  const lastTimestamp = Math.max(...timestamps);
  const first = new Date(firstTimestamp);
  const last = new Date(lastTimestamp);

  if (
    !Number.isFinite(firstTimestamp) ||
    !Number.isFinite(lastTimestamp) ||
    Number.isNaN(first.getTime()) ||
    Number.isNaN(last.getTime())
  ) {
    throw new Error("Replay event timestamps are invalid.");
  }

  return { first, last };
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

function getChunkEvents(value: unknown): ReplayEvent[] {
  return Array.isArray(value) ? (value as ReplayEvent[]) : [];
}

function hasRenderableReplay(events: ReplayEvent[]): boolean {
  return events.length >= 2 && events.some((event) => event.type === 2);
}

function isSessionLive(lastSeenAt: Date, endedAt: Date | null): boolean {
  return !endedAt && Date.now() - lastSeenAt.getTime() <= 15_000;
}

export async function ingestReplayChunkModel(
  chunk: ReplayChunk
): Promise<void> {
  const [project] = await getProjectIDByApiKeyModel(chunk.projectId);

  if (!project) throw new InvalidReplayProjectKeyError();

  const { first, last } = getEventTimestamps(chunk.events);
  const byteCount = Buffer.byteLength(JSON.stringify(chunk.events));
  const [existingSession] = await db
    .select({
      projectId: replaySessions.projectId,
      workspaceId: replaySessions.workspaceId,
      visitorId: replaySessions.visitorId,
    })
    .from(replaySessions)
    .where(eq(replaySessions.id, chunk.sessionId));

  if (
    existingSession &&
    (existingSession.projectId !== project.id ||
      existingSession.workspaceId !== project.workspace_id ||
      existingSession.visitorId !== chunk.visitorId)
  ) {
    throw new Error("Replay session does not belong to this project.");
  }

  const inserted = await db.transaction(async (transaction) => {
    await transaction
      .insert(replaySessions)
      .values({
        id: chunk.sessionId,
        projectId: project.id,
        workspaceId: project.workspace_id,
        visitorId: chunk.visitorId,
        startedAt: first,
        lastSeenAt: last,
        screenWidth: chunk.screen?.width,
        screenHeight: chunk.screen?.height,
        viewportWidth: chunk.viewport?.width,
        viewportHeight: chunk.viewport?.height,
        url: chunk.url,
        path: chunk.path,
      })
      .onConflictDoNothing();

    const [replayChunk] = await transaction
      .insert(replayChunks)
      .values({
        sessionId: chunk.sessionId,
        sequence: chunk.sequence,
        events: chunk.events,
        firstTimestamp: first,
        lastTimestamp: last,
        byteCount,
      })
      .onConflictDoNothing()
      .returning({ id: replayChunks.id });

    if (!replayChunk) return false;

    await transaction
      .update(replaySessions)
      .set({
        startedAt: sql`LEAST(${replaySessions.startedAt}, ${first})`,
        lastSeenAt: sql`GREATEST(${replaySessions.lastSeenAt}, ${last})`,
        lastSequence: sql`GREATEST(${replaySessions.lastSequence}, ${chunk.sequence})`,
        eventCount: sql`${replaySessions.eventCount} + ${chunk.events.length}`,
        byteCount: sql`${replaySessions.byteCount} + ${byteCount}`,
        ...(chunk.screen
          ? {
              screenWidth: chunk.screen.width,
              screenHeight: chunk.screen.height,
            }
          : {}),
        ...(chunk.viewport
          ? {
              viewportWidth: chunk.viewport.width,
              viewportHeight: chunk.viewport.height,
            }
          : {}),
        ...(chunk.url ? { url: chunk.url } : {}),
        ...(chunk.path ? { path: chunk.path } : {}),
        ...(chunk.isFinal ? { endedAt: last } : {}),
      })
      .where(eq(replaySessions.id, chunk.sessionId));

    return true;
  });

  if (inserted) {
    publishReplayChunk({
      sessionId: chunk.sessionId,
      sequence: chunk.sequence,
      events: chunk.events,
      isFinal: Boolean(chunk.isFinal),
    });
  }
}

export async function getReplayDataModel(
  workspaceId: string,
  projectId: string,
  sessionId: string
): Promise<ReplayData> {
  const [session] = await db
    .select({
      lastSequence: replaySessions.lastSequence,
      lastSeenAt: replaySessions.lastSeenAt,
      endedAt: replaySessions.endedAt,
    })
    .from(replaySessions)
    .where(
      and(
        eq(replaySessions.id, sessionId),
        eq(replaySessions.workspaceId, workspaceId),
        eq(replaySessions.projectId, projectId)
      )
    );

  if (!session) {
    return {
      available: false,
      events: [],
      hasMoreEvents: false,
      lastSequence: -1,
      isLive: false,
    };
  }

  const rows = await db
    .select({ sequence: replayChunks.sequence, events: replayChunks.events })
    .from(replayChunks)
    .where(eq(replayChunks.sessionId, sessionId))
    .orderBy(asc(replayChunks.sequence))
    .limit(REPLAY_CHUNK_LIMIT + 1);
  const hasMoreEvents = rows.length > REPLAY_CHUNK_LIMIT;
  const events = rows
    .slice(0, REPLAY_CHUNK_LIMIT)
    .flatMap((row) => getChunkEvents(row.events));

  return {
    available: hasRenderableReplay(events),
    events,
    hasMoreEvents,
    lastSequence: toNumber(session.lastSequence),
    isLive: isSessionLive(session.lastSeenAt, session.endedAt),
  };
}

export async function getReplaySessionAccessModel(
  workspaceId: string,
  projectId: string,
  sessionId: string
): Promise<ReplaySessionAccess | null> {
  const [session] = await db
    .select({
      id: replaySessions.id,
      lastSequence: replaySessions.lastSequence,
      lastSeenAt: replaySessions.lastSeenAt,
      endedAt: replaySessions.endedAt,
    })
    .from(replaySessions)
    .where(
      and(
        eq(replaySessions.id, sessionId),
        eq(replaySessions.workspaceId, workspaceId),
        eq(replaySessions.projectId, projectId)
      )
    );

  if (!session) return null;

  return {
    id: session.id,
    lastSequence: session.lastSequence,
    lastSeenAt: session.lastSeenAt,
    endedAt: session.endedAt,
  };
}

export async function getReplayChunksAfterModel(
  sessionId: string,
  sequence: number
): Promise<ReplayChunkUpdateInput[]> {
  const rows = await db
    .select({ sequence: replayChunks.sequence, events: replayChunks.events })
    .from(replayChunks)
    .where(
      and(
        eq(replayChunks.sessionId, sessionId),
        gt(replayChunks.sequence, sequence)
      )
    )
    .orderBy(asc(replayChunks.sequence))
    .limit(REPLAY_CHUNK_LIMIT);

  return rows.map((row) => ({
    sequence: row.sequence,
    events: getChunkEvents(row.events),
  }));
}

export interface ReplayChunkUpdateInput {
  sequence: number;
  events: ReplayEvent[];
}
