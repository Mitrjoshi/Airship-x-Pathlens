import { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  getReplayChunksAfterModel,
  getReplaySessionAccessModel,
} from "../models/replay.model";
import { subscribeToReplay } from "../lib/replay-live";
import type { ReplayChunkUpdate } from "../lib/replay-live";

const streamQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  since: z.coerce.number().int().min(-1).default(-1),
});

function writeEvent(
  response: Response,
  event: string,
  data: Record<string, unknown>
): void {
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function writeChunk(response: Response, update: ReplayChunkUpdate): void {
  writeEvent(response, "chunk", {
    sequence: update.sequence,
    events: update.events,
    isFinal: update.isFinal,
  });
}

export async function streamSessionReplay(req: Request, res: Response) {
  let query: z.infer<typeof streamQuerySchema>;

  try {
    query = streamQuerySchema.parse(req.query);
  } catch (error) {
    const message =
      error instanceof ZodError
        ? (error.issues[0]?.message ?? "Invalid replay stream request.")
        : "Invalid replay stream request.";

    return res.status(400).json({ success: false, message });
  }

  const sessionId = z.string().min(1).max(255).safeParse(req.params.sessionId);

  if (!sessionId.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid session id.",
    });
  }

  const session = await getReplaySessionAccessModel(
    query.workspace_id,
    query.project_id,
    sessionId.data
  );

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Session replay not found.",
    });
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let streamReady = false;
  let closed = false;
  const pendingUpdates: ReplayChunkUpdate[] = [];

  const listener = (update: ReplayChunkUpdate) => {
    if (closed) return;

    if (!streamReady) {
      pendingUpdates.push(update);
      return;
    }

    writeChunk(res, update);
  };

  const unsubscribe = subscribeToReplay(sessionId.data, listener);
  const heartbeat = setInterval(() => {
    if (!closed) res.write(": keep-alive\n\n");
  }, 15_000);

  const cleanup = () => {
    if (closed) return;

    closed = true;
    clearInterval(heartbeat);
    unsubscribe();
  };

  req.on("close", cleanup);

  try {
    const missedUpdates = await getReplayChunksAfterModel(
      sessionId.data,
      query.since
    );

    if (closed) return;

    writeEvent(res, "ready", {
      sequence: session.lastSequence,
      isLive:
        !session.endedAt && Date.now() - session.lastSeenAt.getTime() <= 15_000,
    });

    for (const update of missedUpdates) {
      writeChunk(res, {
        ...update,
        sessionId: sessionId.data,
        isFinal: false,
      });
    }

    streamReady = true;

    for (const update of pendingUpdates) {
      writeChunk(res, update);
    }
  } catch (error) {
    console.error(error);

    if (!closed) {
      writeEvent(res, "error", {
        message: "Unable to load replay updates.",
      });
    }

    cleanup();
  }
}
