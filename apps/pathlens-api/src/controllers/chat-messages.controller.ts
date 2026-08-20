import { Response } from "express";
import { z, ZodError } from "zod";
import {
  chatReactionSchema,
  sendChatMessageSchema,
} from "@workspace/contracts";

import { ChatRequest } from "../middleware/channel-access.middleware";
import { publishChatEvent } from "../lib/chat-live";
import { AuthRequest } from "../lib/jwt";
import {
  deleteChatMessageModel,
  editChatMessageModel,
  getChatMessagesModel,
  markChatChannelReadModel,
  pinChatMessageModel,
  sendChatMessageModel,
  toggleChatReactionModel,
  unpinChatMessageModel,
} from "../models/chat.model";
import { getWorkspaceAccessModel, hasWorkspacePermission } from "../models/workshop.model";

const channelParamsSchema = z.object({
  channel_id: z.string().uuid("Channel id is required."),
});

const messageParamsSchema = z.object({
  message_id: z.coerce.number().int().positive(),
});

const listMessagesQuerySchema = z.object({
  workspace_id: z.string().uuid("Workspace id is required."),
  before: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const sendMessageBodySchema = sendChatMessageSchema
  .omit({ channel_id: true })
  .extend({
    workspace_id: z.string().uuid("Workspace id is required."),
  });

const editMessageBodySchema = z.object({
  workspace_id: z.string().uuid(),
  channel_id: z.string().uuid(),
  content: z
    .string()
    .trim()
    .min(1, "Message cannot be empty.")
    .max(10000, "Message is too long."),
});

const deleteMessageBodySchema = z.object({
  workspace_id: z.string().uuid(),
  channel_id: z.string().uuid(),
});

const reactionBodySchema = z.object({
  workspace_id: z.string().uuid(),
  channel_id: z.string().uuid(),
});

const readBodySchema = z.object({
  workspace_id: z.string().uuid(),
  last_read_message_id: z.coerce.number().int().positive(),
});

function getErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Validation failed.";
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong.";
}

export async function getChatMessagesController(req: ChatRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { channel_id } = channelParamsSchema.parse(req.params);
    const { before, limit } = listMessagesQuerySchema.parse(req.query);

    const result = await getChatMessagesModel(channel_id, userId, before ?? null, limit);

    return res.status(200).json({
      success: true,
      data: result.messages,
      hasMore: result.hasMore,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function sendChatMessageController(req: ChatRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { channel_id } = channelParamsSchema.parse(req.params);
    const body = sendMessageBodySchema.parse(req.body);

    const message = await sendChatMessageModel({
      channelId: channel_id,
      userId,
      workspaceId: body.workspace_id,
      content: body.content,
      replyToMessageId: body.reply_to_message_id ?? null,
    });

    publishChatEvent(channel_id, {
      type: "message.created",
      channelId: channel_id,
      message,
    });

    return res.status(201).json({ success: true, data: message });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function editChatMessageController(req: ChatRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { message_id } = messageParamsSchema.parse(req.params);
    const body = editMessageBodySchema.parse(req.body);

    const message = await editChatMessageModel({
      channelId: body.channel_id,
      messageId: message_id,
      userId,
      content: body.content,
    });

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    publishChatEvent(body.channel_id, {
      type: "message.updated",
      channelId: body.channel_id,
      message,
    });

    return res.status(200).json({ success: true, data: message });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function deleteChatMessageController(req: ChatRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { message_id } = messageParamsSchema.parse(req.params);
    const { workspace_id, channel_id } = deleteMessageBodySchema.parse(req.body);

    const access = await getWorkspaceAccessModel(workspace_id, userId);
    const canDeleteAny = Boolean(
      access && hasWorkspacePermission(access, "chat.delete_messages")
    );

    const id = await deleteChatMessageModel({
      channelId: channel_id,
      messageId: message_id,
      userId,
      canDeleteAny,
    });

    publishChatEvent(channel_id, {
      type: "message.deleted",
      channelId: channel_id,
      messageId: id,
    });

    return res.status(200).json({ success: true, data: { messageId: id } });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function addChatReactionController(req: ChatRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { message_id } = messageParamsSchema.parse(req.params);
    const { channel_id } = reactionBodySchema.parse(req.body);
    const { emoji } = chatReactionSchema.parse(req.body);

    const reactions = await toggleChatReactionModel({
      channelId: channel_id,
      messageId: message_id,
      userId,
      emoji,
    });

    publishChatEvent(channel_id, {
      type: "reaction.updated",
      channelId: channel_id,
      messageId: message_id,
      reactions,
    });

    return res.status(200).json({ success: true, data: { reactions } });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function removeChatReactionController(req: ChatRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { message_id } = messageParamsSchema.parse(req.params);
    const { channel_id } = reactionBodySchema.parse(req.body);
    const { emoji } = chatReactionSchema.parse({
      ...req.body,
      emoji: req.params.emoji ?? req.body.emoji,
    });

    const reactions = await toggleChatReactionModel({
      channelId: channel_id,
      messageId: message_id,
      userId,
      emoji,
    });

    publishChatEvent(channel_id, {
      type: "reaction.updated",
      channelId: channel_id,
      messageId: message_id,
      reactions,
    });

    return res.status(200).json({ success: true, data: { reactions } });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function pinChatMessageController(req: ChatRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { message_id } = messageParamsSchema.parse(req.params);
    const { channel_id } = reactionBodySchema.parse(req.body);

    const pinned = await pinChatMessageModel({
      channelId: channel_id,
      messageId: message_id,
      userId,
    });

    if (!pinned) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    publishChatEvent(channel_id, {
      type: "message.pinned",
      channelId: channel_id,
      pinned,
    });

    return res.status(200).json({ success: true, data: pinned });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function unpinChatMessageController(req: ChatRequest, res: Response) {
  try {
    const { message_id } = messageParamsSchema.parse(req.params);
    const { channel_id } = reactionBodySchema.parse(req.body);

    const removed = await unpinChatMessageModel(channel_id, message_id);

    if (!removed) {
      return res.status(404).json({ success: false, message: "Message is not pinned." });
    }

    publishChatEvent(channel_id, {
      type: "message.unpinned",
      channelId: channel_id,
      messageId: message_id,
    });

    return res.status(200).json({ success: true, data: { removed } });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function markChatReadController(req: ChatRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { channel_id } = channelParamsSchema.parse(req.params);
    const { last_read_message_id } = readBodySchema.parse(req.body);

    await markChatChannelReadModel({
      channelId: channel_id,
      userId,
      lastReadMessageId: last_read_message_id,
    });

    publishChatEvent(channel_id, {
      type: "read.updated",
      channelId: channel_id,
      userId,
      lastReadMessageId: last_read_message_id,
    });

    return res.status(200).json({ success: true, data: { read: true } });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}