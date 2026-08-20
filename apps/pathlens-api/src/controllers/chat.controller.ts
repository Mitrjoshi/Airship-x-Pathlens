import { Response } from "express";
import { z, ZodError } from "zod";
import {
  createChatChannelSchema,
  createDmSchema,
  updateChatChannelSchema,
} from "@workspace/contracts";

import { ChatRequest } from "../middleware/channel-access.middleware";
import { publishChatEvent } from "../lib/chat-live";
import { AuthRequest } from "../lib/jwt";
import {
  addChatChannelMemberModel,
  archiveChatChannelModel,
  createChatChannelModel,
  createDmChannelModel,
  deleteChatChannelModel,
  getChatChannelMembersModel,
  getChatChannelsModel,
  getChatPinnedMessagesModel,
  getWorkspaceMembersForChatModel,
  insertChatNotificationModel,
  removeChatChannelMemberModel,
  searchChatModel,
  updateChatChannelModel,
} from "../models/chat.model";

const workspaceQuerySchema = z.object({
  workspace_id: z.string().uuid("Workspace id is required."),
});

const memberParamsSchema = z.object({
  channel_id: z.string().uuid("Channel id is required."),
  user_id: z.string().uuid("User id is required."),
});

const channelParamsSchema = z.object({
  channel_id: z.string().uuid("Channel id is required."),
});

const archiveBodySchema = z.object({
  workspace_id: z.string().uuid(),
  archived: z.boolean().default(true),
});

function getErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Validation failed.";
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong.";
}

export async function getChatChannelsController(req: AuthRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id } = workspaceQuerySchema.parse(req.query);

    const result = await getChatChannelsModel(workspace_id, userId);

    return res.status(200).json({
      success: true,
      data: result.channels,
      unread: result.unread,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function getChatChannelController(req: ChatRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const access = req.channelAccess;

    if (!access) {
      return res.status(404).json({ success: false, message: "Channel not found." });
    }

    const { channels } = await getChatChannelsModel(access.channel.workspaceId, userId);

    const channel = channels.find((item) => item.id === access.channel.id);

    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found." });
    }

    const members = await getChatChannelMembersModel(
      channel.id,
      channel.workspaceId,
      channel.visibility === "public"
    );

    return res.status(200).json({
      success: true,
      data: { channel, members },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function createChatChannelController(req: AuthRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const body = createChatChannelSchema.parse(req.body);

    const channel = await createChatChannelModel({
      workspaceId: body.workspace_id,
      userId,
      name: body.name,
      description: body.description ?? null,
      topic: body.topic ?? null,
      visibility: body.visibility,
      memberIds: body.member_ids ?? [],
    });

    return res.status(201).json({ success: true, data: channel });
  } catch (error) {
    return res.status(409).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function updateChatChannelController(req: ChatRequest, res: Response) {
  try {
    const { channel_id } = channelParamsSchema.parse(req.params);
    const body = updateChatChannelSchema.parse(req.body);

    const channel = await updateChatChannelModel({
      channelId: channel_id,
      ...body,
    });

    publishChatEvent(channel_id, {
      type: "channel.updated",
      channelId: channel_id,
      channel,
    });

    return res.status(200).json({ success: true, data: channel });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function archiveChatChannelController(req: ChatRequest, res: Response) {
  try {
    const { channel_id } = channelParamsSchema.parse(req.params);
    const { archived } = archiveBodySchema.parse(req.body);

    const channel = await archiveChatChannelModel(channel_id, archived);

    publishChatEvent(channel_id, {
      type: "channel.updated",
      channelId: channel_id,
      channel,
    });

    return res.status(200).json({ success: true, data: channel });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function deleteChatChannelController(req: ChatRequest, res: Response) {
  try {
    const { channel_id } = channelParamsSchema.parse(req.params);

    const channel = await deleteChatChannelModel(channel_id);

    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found." });
    }

    publishChatEvent(channel_id, { type: "channel.deleted", channelId: channel_id });

    return res.status(200).json({ success: true, data: channel });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function addChatChannelMemberController(req: ChatRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { channel_id, user_id } = memberParamsSchema.parse(req.params);
    const { workspace_id } = z
      .object({ workspace_id: z.string().uuid() })
      .parse(req.body);

    const member = await addChatChannelMemberModel(channel_id, user_id);

    const members = await getWorkspaceMembersForChatModel(workspace_id);
    const target = members.find((member) => member.id === user_id);

    if (member) {
      await insertChatNotificationModel({
        workspaceId: workspace_id,
        recipientUserId: user_id,
        senderUserId: userId,
        type: "channel_invite",
        channelId: channel_id,
      });

      publishChatEvent(channel_id, {
        type: "member.added",
        channelId: channel_id,
        member: {
          userId: user_id,
          name: target?.name ?? "A new member",
          email: target?.email ?? "",
          avatar: target?.avatar ?? null,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: { alreadyMember: !member },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function removeChatChannelMemberController(req: ChatRequest, res: Response) {
  try {
    const { channel_id, user_id } = memberParamsSchema.parse(req.params);

    const member = await removeChatChannelMemberModel(channel_id, user_id);

    if (!member) {
      return res.status(404).json({ success: false, message: "Member not found." });
    }

    publishChatEvent(channel_id, {
      type: "member.removed",
      channelId: channel_id,
      userId: user_id,
    });

    return res.status(200).json({ success: true, data: member });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function createDmChannelController(req: AuthRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const body = createDmSchema.parse(req.body);

    const channel = await createDmChannelModel({
      workspaceId: body.workspace_id,
      userId,
      userIds: body.user_ids,
    });

    return res.status(200).json({ success: true, data: channel });
  } catch (error) {
    return res.status(409).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function getChatPinsController(req: ChatRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { channel_id } = channelParamsSchema.parse(req.params);

    const pins = await getChatPinnedMessagesModel(channel_id, userId);

    return res.status(200).json({ success: true, data: pins });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

const searchQuerySchema = z.object({
  workspace_id: z.string().uuid("Workspace id is required."),
  q: z.string().trim().min(1, "Search query is required.").max(200),
});

export async function searchChatController(req: AuthRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id, q } = searchQuerySchema.parse(req.query);

    const results = await searchChatModel(workspace_id, userId, q);

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}