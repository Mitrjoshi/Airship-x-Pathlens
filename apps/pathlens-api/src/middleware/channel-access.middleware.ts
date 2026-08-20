import type { NextFunction, Response } from "express";
import { z } from "zod";

import { AuthRequest } from "../lib/jwt";
import {
  getChannelAccessModel,
  getChannelMembershipModel,
} from "../models/chat.model";
import { getWorkspaceAccessModel } from "../models/workshop.model";

export interface ChatChannelAccess {
  channel: NonNullable<Awaited<ReturnType<typeof getChannelAccessModel>>>;
  member: {
    userId: string;
    lastReadMessageId: number | null;
  } | null;
}

export interface ChatRequest extends AuthRequest {
  channelAccess?: ChatChannelAccess;
}

const channelIdSchema = z.string().uuid();

export function getChannelIdFromRequest(req: AuthRequest): string | null {
  const raw =
    req.params.channel_id ??
    req.query.channel_id ??
    req.body?.channel_id ??
    req.body?.channelId ??
    null;

  if (typeof raw !== "string") return null;

  const parsed = channelIdSchema.safeParse(raw);

  return parsed.success ? parsed.data : null;
}

export async function resolveChannelAccess(
  req: AuthRequest,
  channelId: string
): Promise<ChatChannelAccess | null> {
  const userId = req.user?.id;

  if (!userId) return null;

  const channel = await getChannelAccessModel(channelId);

  if (!channel) return null;

  const workspaceAccess = await getWorkspaceAccessModel(
    channel.workspaceId,
    userId
  );

  if (!workspaceAccess) return null;

  if (channel.visibility === "public") {
    const membership = await getChannelMembershipModel(channelId, userId);

    return { channel, member: membership };
  }

  const membership = await getChannelMembershipModel(channelId, userId);

  if (!membership) return null;

  return { channel, member: membership };
}

export async function requireChannelAccess(
  req: ChatRequest,
  res: Response,
  next: NextFunction
) {
  const channelId = getChannelIdFromRequest(req);

  if (!channelId) {
    res.status(400).json({ success: false, message: "Channel id is required." });
    return;
  }

  try {
    const access = await resolveChannelAccess(req, channelId);

    if (!access) {
      res.status(404).json({ success: false, message: "Channel not found." });
      return;
    }

    req.channelAccess = access;
    next();
  } catch (error) {
    next(error);
  }
}
