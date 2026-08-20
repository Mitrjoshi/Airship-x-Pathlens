import { Response } from "express";
import { z, ZodError } from "zod";

import { subscribeToChatChannel, type ChatLiveEvent } from "../lib/chat-live";
import { AuthRequest } from "../lib/jwt";
import { resolveChannelAccess } from "../middleware/channel-access.middleware";

const streamQuerySchema = z.object({
  workspace_id: z.string().uuid(),
  channel_id: z.string().uuid(),
});

function writeEvent(response: Response, event: string, data: Record<string, unknown>): void {
  response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function streamChat(req: AuthRequest, res: Response) {
  let query: z.infer<typeof streamQuerySchema>;

  try {
    query = streamQuerySchema.parse(req.query);
  } catch (error) {
    const message =
      error instanceof ZodError
        ? (error.issues[0]?.message ?? "Invalid chat stream request.")
        : "Invalid chat stream request.";

    return res.status(400).json({ success: false, message });
  }

  const access = await resolveChannelAccess(req, query.channel_id);

  if (!access) {
    return res.status(404).json({
      success: false,
      message: "Channel not found.",
    });
  }

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let closed = false;

  const listener = (event: ChatLiveEvent) => {
    if (closed) return;

    writeEvent(res, event.type, event);
  };

  const unsubscribe = subscribeToChatChannel(query.channel_id, listener);
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
    if (closed) return;

    writeEvent(res, "ready", {
      channelId: access.channel.id,
      workspaceId: access.channel.workspaceId,
      member: access.member
        ? { userId: access.member.userId, lastReadMessageId: access.member.lastReadMessageId }
        : null,
    });
  } catch (error) {
    console.error(error);

    if (!closed) {
      writeEvent(res, "error", {
        message: "Unable to open chat stream.",
      });
    }

    cleanup();
  }
}