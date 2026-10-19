import { and, asc, eq, gt, sql } from "drizzle-orm";
import type { ReplayChunk, ReplayEvent } from "@workspace/contracts";
import { db } from "../db/client";
import { replayChunks, replaySessions } from "../db/schema";
import { getProjectByIdModel } from "./projects.model";
import { publishReplayChunk } from "../lib/replay-live";
import {
  sanitizeReplayChunk,
  sanitizeReplayEvents,
} from "../lib/replay-privacy";
import { assertWorkspaceUsageLimit } from "./usage.model";

const REPLAY_CHUNK_LIMIT = 250;

export class InvalidReplayProjectKeyError extends Error {
  constructor() {
    super("Invalid tracking project.");
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
  return Array.isArray(value)
    ? sanitizeReplayEvents(value as ReplayEvent[])
    : [];
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
  const safeChunk = sanitizeReplayChunk(chunk);
  const [project] = await getProjectByIdModel(safeChunk.projectId);

  if (!project) throw new InvalidReplayProjectKeyError();

  const { first, last } = getEventTimestamps(safeChunk.events);
  const byteCount = Buffer.byteLength(JSON.stringify(safeChunk.events));
  const [existingSession] = await db
    .select({
      projectId: replaySessions.projectId,
      workspaceId: replaySessions.workspaceId,
      visitorId: replaySessions.visitorId,
    })
    .from(replaySessions)
    .where(eq(replaySessions.id, safeChunk.sessionId));

  if (
    existingSession &&
    (existingSession.projectId !== project.id ||
      existingSession.workspaceId !== project.workspace_id ||
      existingSession.visitorId !== safeChunk.visitorId)
  ) {
    throw new Error("Replay session does not belong to this project.");
  }

  await assertWorkspaceUsageLimit(project.workspace_id, "recordings");

  const inserted = await db.transaction(async (transaction) => {
    await transaction
      .insert(replaySessions)
      .values({
        id: safeChunk.sessionId,
        projectId: project.id,
        workspaceId: project.workspace_id,
        visitorId: safeChunk.visitorId,
        startedAt: first,
        lastSeenAt: last,
        screenWidth: safeChunk.screen?.width,
        screenHeight: safeChunk.screen?.height,
        viewportWidth: safeChunk.viewport?.width,
        viewportHeight: safeChunk.viewport?.height,
        url: safeChunk.url,
        path: safeChunk.path,
      })
      .onConflictDoNothing();

    const [replayChunk] = await transaction
      .insert(replayChunks)
      .values({
        sessionId: safeChunk.sessionId,
        sequence: safeChunk.sequence,
        events: safeChunk.events,
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
        lastSequence: sql`GREATEST(${replaySessions.lastSequence}, ${safeChunk.sequence})`,
        eventCount: sql`${replaySessions.eventCount} + ${safeChunk.events.length}`,
        byteCount: sql`${replaySessions.byteCount} + ${byteCount}`,
        ...(safeChunk.screen
          ? {
              screenWidth: safeChunk.screen.width,
              screenHeight: safeChunk.screen.height,
            }
          : {}),
        ...(safeChunk.viewport
          ? {
              viewportWidth: safeChunk.viewport.width,
              viewportHeight: safeChunk.viewport.height,
            }
          : {}),
        ...(safeChunk.url ? { url: safeChunk.url } : {}),
        ...(safeChunk.path ? { path: safeChunk.path } : {}),
        ...(safeChunk.isFinal ? { endedAt: last } : {}),
      })
      .where(eq(replaySessions.id, safeChunk.sessionId));

    return true;
  });

  if (inserted) {
    publishReplayChunk({
      sessionId: safeChunk.sessionId,
      sequence: safeChunk.sequence,
      events: safeChunk.events,
      isFinal: Boolean(safeChunk.isFinal),
    });
  }
}

async function getReplayDataModelInternal(
  workspaceId: string,
  projectId: string,
  sessionId: string,
  loadAllChunks: boolean
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

  const rows = loadAllChunks
    ? await db
        .select({
          sequence: replayChunks.sequence,
          events: replayChunks.events,
        })
        .from(replayChunks)
        .where(eq(replayChunks.sessionId, sessionId))
        .orderBy(asc(replayChunks.sequence))
    : await db
        .select({
          sequence: replayChunks.sequence,
          events: replayChunks.events,
        })
        .from(replayChunks)
        .where(eq(replayChunks.sessionId, sessionId))
        .orderBy(asc(replayChunks.sequence))
        .limit(REPLAY_CHUNK_LIMIT + 1);
  const hasMoreEvents = rows.length > REPLAY_CHUNK_LIMIT;
  const events = rows
    .slice(0, loadAllChunks ? undefined : REPLAY_CHUNK_LIMIT)
    .flatMap((row) => getChunkEvents(row.events));

  return {
    available: hasRenderableReplay(events),
    events,
    hasMoreEvents,
    lastSequence: toNumber(session.lastSequence),
    isLive: isSessionLive(session.lastSeenAt, session.endedAt),
  };
}

export function getReplayDataModel(
  workspaceId: string,
  projectId: string,
  sessionId: string
): Promise<ReplayData> {
  return getReplayDataModelInternal(workspaceId, projectId, sessionId, false);
}

export function getCompleteReplayDataModel(
  workspaceId: string,
  projectId: string,
  sessionId: string
): Promise<ReplayData> {
  return getReplayDataModelInternal(workspaceId, projectId, sessionId, true);
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
