import { and, eq } from "drizzle-orm";

import { db } from "../db/client";
import { chatChannelMembers, chatChannels } from "../db/schema";

export async function getChannelAccessModel(channelId: string) {
  const [channel] = await db
    .select({
      id: chatChannels.id,
      workspaceId: chatChannels.workspaceId,
      projectId: chatChannels.projectId,
      type: chatChannels.type,
      name: chatChannels.name,
      description: chatChannels.description,
      topic: chatChannels.topic,
      visibility: chatChannels.visibility,
      createdBy: chatChannels.createdBy,
      archivedAt: chatChannels.archivedAt,
      createdAt: chatChannels.createdAt,
      updatedAt: chatChannels.updatedAt,
    })
    .from(chatChannels)
    .where(eq(chatChannels.id, channelId));

  return channel ?? null;
}

export async function getChannelMembershipModel(
  channelId: string,
  userId: string
) {
  const [membership] = await db
    .select({
      userId: chatChannelMembers.userId,
      lastReadMessageId: chatChannelMembers.lastReadMessageId,
    })
    .from(chatChannelMembers)
    .where(
      and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, userId)
      )
    );

  return membership ?? null;
}
