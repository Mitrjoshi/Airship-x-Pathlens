import {
  and,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";

import type {
  ChatChannel,
  ChatChannelMember,
  ChatChannelType,
  ChatChannelVisibility,
  ChatMessage,
  ChatPinnedMessage,
  ChatReaction,
  ChatSearchResults,
  ChatUnreadSummary,
} from "@workspace/contracts";

import { db } from "../db/client";
import {
  chatChannelMembers,
  chatChannels,
  chatMessageReactions,
  chatMessages,
  chatPinnedMessages,
  notifications,
  users,
  workspaceMembers,
} from "../db/schema";

/* -------------------------------------------------------------------------- */
/*                                  INTERNAL                                  */
/* -------------------------------------------------------------------------- */

interface MessageRow {
  id: number;
  channelId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderAvatar: string | null;
  content: string;
  replyToMessageId: number | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function buildChannelFromRow(
  row: {
    id: string;
    workspaceId: string;
    projectId: string | null;
    type: string;
    name: string;
    description: string | null;
    topic: string | null;
    visibility: string;
    createdBy: string;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  },
  extras: {
    memberCount: number;
    unreadCount: number;
    mentionCount: number;
    lastMessagePreview: string | null;
    lastMessageAt: string | null;
    lastReadMessageId: number | null;
  }
): ChatChannel {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    projectName: null,
    type: row.type as ChatChannelType,
    name: row.name,
    description: row.description,
    topic: row.topic,
    visibility: row.visibility as ChatChannelVisibility,
    createdBy: row.createdBy,
    archivedAt: row.archivedAt ? row.archivedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...extras,
  };
}

async function getLastMessageForChannel(channelId: string) {
  const [row] = await db
    .select({
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(
      and(eq(chatMessages.channelId, channelId), isNull(chatMessages.deletedAt))
    )
    .orderBy(desc(chatMessages.id))
    .limit(1);

  return row ?? null;
}

async function getLastMessagesForChannels(channelIds: string[]) {
  if (channelIds.length === 0)
    return new Map<string, { content: string; createdAt: Date }>();

  const rows = await db
    .selectDistinctOn([chatMessages.channelId], {
      channelId: chatMessages.channelId,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(
      and(
        inArray(chatMessages.channelId, channelIds),
        isNull(chatMessages.deletedAt)
      )
    )
    .orderBy(chatMessages.channelId, desc(chatMessages.id));

  return new Map(
    rows.map((row) => [row.channelId, { content: row.content, createdAt: row.createdAt }])
  );
}

async function getUnreadCountModel(
  channelId: string,
  userId: string,
  lastReadMessageId: number | null
) {
  if (!lastReadMessageId) return 0;

  const rows = await db
    .select({ value: count() })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.channelId, channelId),
        gt(chatMessages.id, lastReadMessageId),
        isNull(chatMessages.deletedAt),
        isNull(chatMessages.replyToMessageId),
        ne(chatMessages.senderId, userId)
      )
    );

  return Number(rows[0]?.value ?? 0);
}

async function getMentionCountModel(userId: string, channelId: string) {
  const rows = await db
    .select({ value: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.recipientUserId, userId),
        eq(notifications.channelId, channelId),
        eq(notifications.type, "chat_mention"),
        isNull(notifications.readAt)
      )
    );

  return Number(rows[0]?.value ?? 0);
}

function extractMentionedUserIds(
  content: string,
  members: { id: string; name: string }[]
): Set<string> {
  const mentioned = new Set<string>();

  for (const member of members) {
    const escaped = member.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|\\s)@${escaped}(?=\\s|$|[.,!?;:])`, "i");

    if (regex.test(content)) mentioned.add(member.id);
  }

  return mentioned;
}

async function hydrateMessages(userId: string, rows: MessageRow[]): Promise<ChatMessage[]> {
  const messageIds = rows.map((row) => row.id);

  const [reactionRows, pinnedRows, replyRows] = await Promise.all([
    messageIds.length > 0
      ? db
          .select({
            messageId: chatMessageReactions.messageId,
            userId: chatMessageReactions.userId,
            emoji: chatMessageReactions.emoji,
          })
          .from(chatMessageReactions)
          .where(inArray(chatMessageReactions.messageId, messageIds))
      : Promise.resolve([] as { messageId: number; userId: string; emoji: string }[]),
    messageIds.length > 0
      ? db
          .select({ messageId: chatPinnedMessages.messageId })
          .from(chatPinnedMessages)
          .where(inArray(chatPinnedMessages.messageId, messageIds))
      : Promise.resolve([] as { messageId: number }[]),
    messageIds.length > 0
      ? db
          .select({
            replyToMessageId: chatMessages.replyToMessageId,
            value: count(),
          })
          .from(chatMessages)
          .where(
            and(
              inArray(chatMessages.replyToMessageId, messageIds),
              isNull(chatMessages.deletedAt)
            )
          )
          .groupBy(chatMessages.replyToMessageId)
      : Promise.resolve([] as { replyToMessageId: number | null; value: number }[]),
  ]);

  const pinnedIds = new Set(pinnedRows.map((row) => row.messageId));

  const replyCounts = new Map(
    replyRows
      .filter((row) => row.replyToMessageId !== null)
      .map((row) => [row.replyToMessageId as number, Number(row.value)])
  );

  const reactionsByMessage = new Map<number, ChatReaction[]>();

  for (const reaction of reactionRows) {
    const list = reactionsByMessage.get(reaction.messageId) ?? [];
    const existing = list.find((item) => item.emoji === reaction.emoji);

    if (existing) {
      existing.count += 1;
      if (reaction.userId === userId) existing.reactedByMe = true;
    } else {
      list.push({
        emoji: reaction.emoji as ChatReaction["emoji"],
        count: 1,
        reactedByMe: reaction.userId === userId,
      });
    }

    reactionsByMessage.set(reaction.messageId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    channelId: row.channelId,
    senderId: row.senderId,
    senderName: row.senderName,
    senderEmail: row.senderEmail,
    senderAvatar: row.senderAvatar,
    content: row.content,
    replyToMessageId: row.replyToMessageId,
    editedAt: row.editedAt ? row.editedAt.toISOString() : null,
    deletedAt: row.deletedAt ? row.deletedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    reactions: reactionsByMessage.get(row.id) ?? [],
    isPinned: pinnedIds.has(row.id),
    replyCount: replyCounts.get(row.id) ?? 0,
  }));
}

/* -------------------------------------------------------------------------- */
/*                                  CHANNELS                                  */
/* -------------------------------------------------------------------------- */

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

export async function getChannelMembershipModel(channelId: string, userId: string) {
  const [row] = await db
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

  return row ?? null;
}

export async function getChatChannelsModel(workspaceId: string, userId: string) {
  const membershipRows = await db
    .select({
      channelId: chatChannelMembers.channelId,
      lastReadMessageId: chatChannelMembers.lastReadMessageId,
    })
    .from(chatChannelMembers)
    .where(eq(chatChannelMembers.userId, userId));

  const membershipByChannel = new Map(
    membershipRows.map((row) => [row.channelId, row.lastReadMessageId])
  );

  const publicRows = await db
    .select({ id: chatChannels.id })
    .from(chatChannels)
    .where(
      and(
        eq(chatChannels.workspaceId, workspaceId),
        eq(chatChannels.visibility, "public"),
        isNull(chatChannels.archivedAt)
      )
    );

  const accessibleIds = Array.from(
    new Set([
      ...membershipRows.map((row) => row.channelId),
      ...publicRows.map((row) => row.id),
    ])
  );

  if (accessibleIds.length === 0) {
    return {
      channels: [],
      unread: { totalUnread: 0, totalMentions: 0 } as ChatUnreadSummary,
    };
  }

  const channelRows = await db
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
    .where(
      and(
        inArray(chatChannels.id, accessibleIds),
        eq(chatChannels.workspaceId, workspaceId),
        isNull(chatChannels.archivedAt)
      )
    )
    .orderBy(desc(chatChannels.updatedAt));

  const lastMessages = await getLastMessagesForChannels(
    channelRows.map((row) => row.id)
  );

  const memberCounts = await db
    .select({
      channelId: chatChannelMembers.channelId,
      value: count(),
    })
    .from(chatChannelMembers)
    .where(
      inArray(
        chatChannelMembers.channelId,
        channelRows.map((row) => row.id)
      )
    )
    .groupBy(chatChannelMembers.channelId);

  const memberCountByChannel = new Map(
    memberCounts.map((row) => [row.channelId, Number(row.value)])
  );

  const unreadResults = await Promise.all(
    channelRows.map((row) => {
      const lastReadMessageId = membershipByChannel.get(row.id) ?? null;

      return Promise.all([
        getUnreadCountModel(row.id, userId, lastReadMessageId),
        getMentionCountModel(userId, row.id),
      ]);
    })
  );

  const channels = channelRows.map((row, index) => {
    const lastMessage = lastMessages.get(row.id);
    const lastReadMessageId = membershipByChannel.get(row.id) ?? null;
    const [unreadCount, mentionCount] = unreadResults[index];

    return buildChannelFromRow(row, {
      memberCount: memberCountByChannel.get(row.id) ?? 0,
      unreadCount,
      mentionCount,
      lastMessagePreview: lastMessage?.content ?? null,
      lastMessageAt: lastMessage ? lastMessage.createdAt.toISOString() : null,
      lastReadMessageId,
    });
  });

  const unread = channels.reduce<ChatUnreadSummary>(
    (summary, channel) => ({
      totalUnread: summary.totalUnread + channel.unreadCount,
      totalMentions: summary.totalMentions + channel.mentionCount,
    }),
    { totalUnread: 0, totalMentions: 0 }
  );

  return { channels, unread };
}

export async function getChatChannelMembersModel(
  channelId: string,
  workspaceId: string,
  isPublic: boolean
): Promise<ChatChannelMember[]> {
  if (isPublic) {
    const rows = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        joinedAt: workspaceMembers.createdAt,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, workspaceId))
      .orderBy(users.name);

    return rows.map((row) => ({
      channelId,
      ...row,
      joinedAt: (row.joinedAt ?? new Date()).toISOString(),
    }));
  }

  const rows = await db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      joinedAt: chatChannelMembers.joinedAt,
    })
    .from(chatChannelMembers)
    .innerJoin(users, eq(users.id, chatChannelMembers.userId))
    .where(eq(chatChannelMembers.channelId, channelId))
    .orderBy(users.name);

  return rows.map((row) => ({
    channelId,
    ...row,
    joinedAt: (row.joinedAt ?? new Date()).toISOString(),
  }));
}

export async function createChatChannelModel(data: {
  workspaceId: string;
  userId: string;
  name: string;
  description: string | null;
  topic: string | null;
  visibility: ChatChannelVisibility;
  memberIds: string[];
  type?: ChatChannelType;
}): Promise<ChatChannel> {
  const existing = await db
    .select({ id: chatChannels.id })
    .from(chatChannels)
    .where(
      and(
        eq(chatChannels.workspaceId, data.workspaceId),
        eq(chatChannels.type, data.type ?? "channel"),
        eq(chatChannels.name, data.name),
        isNull(chatChannels.archivedAt)
      )
    );

  if (existing.length > 0) {
    throw new Error("A channel with this name already exists.");
  }

  const created = await db.transaction(async (tx) => {
    const [channel] = await tx
      .insert(chatChannels)
      .values({
        workspaceId: data.workspaceId,
        type: data.type ?? "channel",
        name: data.name,
        description: data.description,
        topic: data.topic,
        visibility: data.visibility,
        createdBy: data.userId,
      })
      .returning();

    const memberSet = new Set([data.userId, ...data.memberIds]);

    if (memberSet.size > 0) {
      await tx
        .insert(chatChannelMembers)
        .values(
          Array.from(memberSet).map((userId) => ({
            channelId: channel.id,
            userId,
          }))
        )
        .onConflictDoNothing();
    }

    return channel;
  });

  const lastMessage = await getLastMessageForChannel(created.id);

  return buildChannelFromRow(created, {
    memberCount: new Set([data.userId, ...data.memberIds]).size,
    unreadCount: 0,
    mentionCount: 0,
    lastMessagePreview: lastMessage?.content ?? null,
    lastMessageAt: lastMessage ? lastMessage.createdAt.toISOString() : null,
    lastReadMessageId: null,
  });
}

export async function createDmChannelModel(data: {
  workspaceId: string;
  userId: string;
  userIds: string[];
}) {
  const memberIds = Array.from(new Set([data.userId, ...data.userIds]));

  if (memberIds.length < 2) {
    throw new Error("A direct message needs at least one other person.");
  }

  const type: ChatChannelType = memberIds.length === 2 ? "dm" : "group_dm";

  const candidateChannels = await db
    .select({
      id: chatChannels.id,
    })
    .from(chatChannels)
    .where(
      and(
        eq(chatChannels.workspaceId, data.workspaceId),
        eq(chatChannels.type, type),
        isNull(chatChannels.archivedAt)
      )
    );

  const expectedSet = new Set(memberIds);

  for (const candidate of candidateChannels) {
    const members = await db
      .select({ userId: chatChannelMembers.userId })
      .from(chatChannelMembers)
      .where(eq(chatChannelMembers.channelId, candidate.id));

    const memberSet = new Set(members.map((member) => member.userId));

    if (
      memberSet.size === memberIds.length &&
      memberIds.every((id) => memberSet.has(id))
    ) {
      const { channels } = await getChatChannelsModel(data.workspaceId, data.userId);

      const found = channels.find((item) => item.id === candidate.id);

      if (found) return found;
    }
  }

  const memberRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, memberIds));

  const nameMap = new Map(memberRows.map((row) => [row.id, row.name]));
  const otherNames = memberIds
    .filter((id) => id !== data.userId)
    .map((id) => nameMap.get(id))
    .filter((name): name is string => Boolean(name));

  const name =
    type === "dm"
      ? otherNames[0] ?? "Direct message"
      : `Group with ${otherNames.slice(0, 2).join(", ")}${
          otherNames.length > 2 ? ` and ${otherNames.length - 2} more` : ""
        }`;

  const created = await createChatChannelModel({
    workspaceId: data.workspaceId,
    userId: data.userId,
    name,
    description: null,
    topic: null,
    visibility: "private",
    memberIds: memberIds.filter((id) => id !== data.userId),
    type,
  });

  for (const memberId of memberIds) {
    if (memberId === data.userId) continue;

    await insertChatNotificationModel({
      workspaceId: data.workspaceId,
      recipientUserId: memberId,
      senderUserId: data.userId,
      type: "chat_dm",
      channelId: created.id,
    });
  }

  return created;
}

export async function updateChatChannelModel(data: {
  channelId: string;
  name?: string;
  description?: string;
  topic?: string;
  visibility?: ChatChannelVisibility;
}) {
  const updates: Record<string, unknown> = { updatedAt: new Date() };

  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.topic !== undefined) updates.topic = data.topic;
  if (data.visibility !== undefined) updates.visibility = data.visibility;

  const [channel] = await db
    .update(chatChannels)
    .set(updates)
    .where(eq(chatChannels.id, data.channelId))
    .returning();

  return channel;
}

export async function archiveChatChannelModel(channelId: string, archived: boolean) {
  const [channel] = await db
    .update(chatChannels)
    .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
    .where(eq(chatChannels.id, channelId))
    .returning();

  return channel;
}

export async function deleteChatChannelModel(channelId: string) {
  const [channel] = await db
    .delete(chatChannels)
    .where(eq(chatChannels.id, channelId))
    .returning({ id: chatChannels.id });

  return channel;
}

export async function addChatChannelMemberModel(channelId: string, userId: string) {
  const [member] = await db
    .insert(chatChannelMembers)
    .values({ channelId, userId })
    .onConflictDoNothing()
    .returning({ userId: chatChannelMembers.userId });

  return member ?? null;
}

export async function removeChatChannelMemberModel(channelId: string, userId: string) {
  const [member] = await db
    .delete(chatChannelMembers)
    .where(
      and(
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, userId)
      )
    )
    .returning({ userId: chatChannelMembers.userId });

  return member ?? null;
}

export async function getWorkspaceMembersForChatModel(workspaceId: string) {
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(users.name);
}

export async function getWorkspaceMemberCountModel(workspaceId: string) {
  const rows = await db
    .select({ value: count() })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId));

  return Number(rows[0]?.value ?? 0);
}

/* -------------------------------------------------------------------------- */
/*                                  MESSAGES                                  */
/* -------------------------------------------------------------------------- */

export async function getChatMessagesModel(
  channelId: string,
  userId: string,
  before: number | null,
  limit = 50
) {
  const safeLimit = Math.min(Math.max(limit, 1), 100);

  const conditions = [eq(chatMessages.channelId, channelId)];

  if (before) {
    conditions.push(lt(chatMessages.id, before));
  }

  const rows = await db
    .select({
      id: chatMessages.id,
      channelId: chatMessages.channelId,
      senderId: chatMessages.senderId,
      senderName: users.name,
      senderEmail: users.email,
      senderAvatar: users.avatar,
      content: chatMessages.content,
      replyToMessageId: chatMessages.replyToMessageId,
      editedAt: chatMessages.editedAt,
      deletedAt: chatMessages.deletedAt,
      createdAt: chatMessages.createdAt,
      updatedAt: chatMessages.updatedAt,
    })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.senderId))
    .where(and(...conditions))
    .orderBy(desc(chatMessages.id))
    .limit(safeLimit);

  const hasMore = rows.length === safeLimit;

  const messages = await hydrateMessages(userId, rows);

  return { messages, hasMore };
}

export async function getChatMessageModel(channelId: string, messageId: number, userId: string) {
  const [row] = await db
    .select({
      id: chatMessages.id,
      channelId: chatMessages.channelId,
      senderId: chatMessages.senderId,
      senderName: users.name,
      senderEmail: users.email,
      senderAvatar: users.avatar,
      content: chatMessages.content,
      replyToMessageId: chatMessages.replyToMessageId,
      editedAt: chatMessages.editedAt,
      deletedAt: chatMessages.deletedAt,
      createdAt: chatMessages.createdAt,
      updatedAt: chatMessages.updatedAt,
    })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.senderId))
    .where(
      and(eq(chatMessages.channelId, channelId), eq(chatMessages.id, messageId))
    );

  if (!row) return null;

  const [message] = await hydrateMessages(userId, [row]);

  return message ?? null;
}

export async function getChatMessagesByIds(
  channelId: string,
  messageIds: number[],
  userId: string
) {
  if (messageIds.length === 0) return [];

  const rows = await db
    .select({
      id: chatMessages.id,
      channelId: chatMessages.channelId,
      senderId: chatMessages.senderId,
      senderName: users.name,
      senderEmail: users.email,
      senderAvatar: users.avatar,
      content: chatMessages.content,
      replyToMessageId: chatMessages.replyToMessageId,
      editedAt: chatMessages.editedAt,
      deletedAt: chatMessages.deletedAt,
      createdAt: chatMessages.createdAt,
      updatedAt: chatMessages.updatedAt,
    })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.senderId))
    .where(
      and(
        eq(chatMessages.channelId, channelId),
        inArray(chatMessages.id, messageIds)
      )
    );

  return await hydrateMessages(userId, rows);
}

export async function sendChatMessageModel(data: {
  channelId: string;
  userId: string;
  workspaceId: string;
  content: string;
  replyToMessageId: number | null;
}) {
  const [messageRow] = await db
    .insert(chatMessages)
    .values({
      workspaceId: data.workspaceId,
      channelId: data.channelId,
      senderId: data.userId,
      content: data.content,
      replyToMessageId: data.replyToMessageId,
    })
    .returning({
      id: chatMessages.id,
      channelId: chatMessages.channelId,
      senderId: chatMessages.senderId,
      content: chatMessages.content,
      replyToMessageId: chatMessages.replyToMessageId,
      createdAt: chatMessages.createdAt,
      updatedAt: chatMessages.updatedAt,
    });

  await db
    .update(chatChannels)
    .set({ updatedAt: new Date() })
    .where(eq(chatChannels.id, data.channelId));

  const channel = await getChannelAccessModel(data.channelId);

  if (channel) {
    await createMessageNotificationsModel({
      workspaceId: data.workspaceId,
      senderUserId: data.userId,
      channelId: data.channelId,
      channelType: channel.type,
      content: data.content,
      replyToMessageId: data.replyToMessageId,
    });
  }

  const message = await getChatMessageModel(data.channelId, messageRow.id, data.userId);

  if (!message) throw new Error("Unable to load the message.");

  return message;
}

async function createMessageNotificationsModel(data: {
  workspaceId: string;
  senderUserId: string;
  channelId: string;
  channelType: string;
  content: string;
  replyToMessageId: number | null;
}) {
  const targets = new Set<string>();

  if (data.replyToMessageId) {
    const [parent] = await db
      .select({ senderId: chatMessages.senderId })
      .from(chatMessages)
      .where(eq(chatMessages.id, data.replyToMessageId));

    if (parent && parent.senderId !== data.senderUserId) {
      targets.add(parent.senderId);
      await insertChatNotificationModel({
        workspaceId: data.workspaceId,
        recipientUserId: parent.senderId,
        senderUserId: data.senderUserId,
        type: "chat_reply",
        channelId: data.channelId,
        messageId: data.replyToMessageId,
      });
    }
  }

  if (data.channelType === "dm" || data.channelType === "group_dm") {
    const members = await db
      .select({ userId: chatChannelMembers.userId })
      .from(chatChannelMembers)
      .where(eq(chatChannelMembers.channelId, data.channelId));

    for (const member of members) {
      if (member.userId === data.senderUserId || targets.has(member.userId)) continue;

      targets.add(member.userId);
      await insertChatNotificationModel({
        workspaceId: data.workspaceId,
        recipientUserId: member.userId,
        senderUserId: data.senderUserId,
        type: "chat_dm",
        channelId: data.channelId,
      });
    }
  }

  if (data.content.includes("@")) {
    const workspaceMembersForMention = await getWorkspaceMembersForChatModel(data.workspaceId);

    const mentionedIds = extractMentionedUserIds(
      data.content,
      workspaceMembersForMention.map((member) => ({ id: member.id, name: member.name }))
    );

    for (const mentionedId of mentionedIds) {
      if (mentionedId === data.senderUserId || targets.has(mentionedId)) continue;

      targets.add(mentionedId);
      await insertChatNotificationModel({
        workspaceId: data.workspaceId,
        recipientUserId: mentionedId,
        senderUserId: data.senderUserId,
        type: "chat_mention",
        channelId: data.channelId,
      });
    }
  }
}

export async function editChatMessageModel(data: {
  channelId: string;
  messageId: number;
  userId: string;
  content: string;
}) {
  const [row] = await db
    .update(chatMessages)
    .set({ content: data.content, editedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(chatMessages.id, data.messageId),
        eq(chatMessages.channelId, data.channelId),
        eq(chatMessages.senderId, data.userId),
        isNull(chatMessages.deletedAt)
      )
    )
    .returning({ id: chatMessages.id });

  if (!row) throw new Error("Message not found.");

  return getChatMessageModel(data.channelId, data.messageId, data.userId);
}

export async function deleteChatMessageModel(data: {
  channelId: string;
  messageId: number;
  userId: string;
  canDeleteAny: boolean;
}) {
  const conditions = [
    eq(chatMessages.id, data.messageId),
    eq(chatMessages.channelId, data.channelId),
    isNull(chatMessages.deletedAt),
  ];

  if (!data.canDeleteAny) conditions.push(eq(chatMessages.senderId, data.userId));

  const [row] = await db
    .update(chatMessages)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: chatMessages.id });

  if (!row) throw new Error("Message not found or you cannot delete it.");

  return row.id;
}

export async function toggleChatReactionModel(data: {
  channelId: string;
  messageId: number;
  userId: string;
  emoji: string;
}) {
  const [message] = await db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.id, data.messageId),
        eq(chatMessages.channelId, data.channelId),
        isNull(chatMessages.deletedAt)
      )
    );

  if (!message) throw new Error("Message not found.");

  const existing = await db
    .select({ id: chatMessageReactions.id })
    .from(chatMessageReactions)
    .where(
      and(
        eq(chatMessageReactions.messageId, data.messageId),
        eq(chatMessageReactions.userId, data.userId),
        eq(chatMessageReactions.emoji, data.emoji)
      )
    );

  if (existing.length > 0) {
    await db
      .delete(chatMessageReactions)
      .where(eq(chatMessageReactions.id, existing[0].id));
  } else {
    await db.insert(chatMessageReactions).values({
      messageId: data.messageId,
      userId: data.userId,
      emoji: data.emoji,
    });
  }

  const rows = await db
    .select({
      messageId: chatMessageReactions.messageId,
      userId: chatMessageReactions.userId,
      emoji: chatMessageReactions.emoji,
    })
    .from(chatMessageReactions)
    .where(eq(chatMessageReactions.messageId, data.messageId));

  return aggregateReactions(rows, data.userId);
}

function aggregateReactions(
  rows: { messageId: number; userId: string; emoji: string }[],
  userId: string
): ChatReaction[] {
  const grouped = new Map<string, { count: number; reactedByMe: boolean }>();

  for (const row of rows) {
    const current = grouped.get(row.emoji) ?? { count: 0, reactedByMe: false };

    current.count += 1;

    if (row.userId === userId) current.reactedByMe = true;

    grouped.set(row.emoji, current);
  }

  return Array.from(grouped.entries()).map(([emoji, value]) => ({
    emoji: emoji as ChatReaction["emoji"],
    count: value.count,
    reactedByMe: value.reactedByMe,
  }));
}

export async function pinChatMessageModel(data: {
  channelId: string;
  messageId: number;
  userId: string;
}): Promise<ChatPinnedMessage | null> {
  const [message] = await db
    .select({ id: chatMessages.id })
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.id, data.messageId),
        eq(chatMessages.channelId, data.channelId),
        isNull(chatMessages.deletedAt)
      )
    );

  if (!message) throw new Error("Message not found.");

  const [pinned, existing] = await db.transaction(async (tx): Promise<
    [
      { id: string; messageId: number; pinnedBy: string; createdAt: Date } | null,
      { id: string; messageId: number; pinnedBy: string; createdAt: Date } | null,
    ]
  > => {
    const inserted = await tx
      .insert(chatPinnedMessages)
      .values({
        channelId: data.channelId,
        messageId: data.messageId,
        pinnedBy: data.userId,
      })
      .onConflictDoNothing()
      .returning({
        id: chatPinnedMessages.id,
        messageId: chatPinnedMessages.messageId,
        pinnedBy: chatPinnedMessages.pinnedBy,
        createdAt: chatPinnedMessages.createdAt,
      });

    if (inserted.length > 0) return [inserted[0], null];

    const [found] = await tx
      .select({
        id: chatPinnedMessages.id,
        messageId: chatPinnedMessages.messageId,
        pinnedBy: chatPinnedMessages.pinnedBy,
        createdAt: chatPinnedMessages.createdAt,
      })
      .from(chatPinnedMessages)
      .where(
        and(
          eq(chatPinnedMessages.channelId, data.channelId),
          eq(chatPinnedMessages.messageId, data.messageId)
        )
      );

    return [null, found ?? null];
  });

  const [pinner] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, data.userId));

  const hydrated = await getChatMessagesByIds(
    data.channelId,
    [data.messageId],
    data.userId
  );

  return {
    id: existing?.id ?? "existing",
    messageId: data.messageId,
    pinnedBy: pinned?.pinnedBy ?? data.userId,
    pinnedByName: pinner?.name ?? "Someone",
    pinnedAt: (pinned?.createdAt ?? new Date()).toISOString(),
    message: hydrated[0] ?? null,
  };
}

export async function unpinChatMessageModel(channelId: string, messageId: number) {
  const [removed] = await db
    .delete(chatPinnedMessages)
    .where(
      and(
        eq(chatPinnedMessages.channelId, channelId),
        eq(chatPinnedMessages.messageId, messageId)
      )
    )
    .returning({ id: chatPinnedMessages.id });

  return Boolean(removed);
}

export async function getChatPinnedMessagesModel(channelId: string, userId: string) {
  const pinnedRows = await db
    .select({
      id: chatPinnedMessages.id,
      messageId: chatPinnedMessages.messageId,
      pinnedBy: chatPinnedMessages.pinnedBy,
      pinnedByName: users.name,
      pinnedAt: chatPinnedMessages.createdAt,
    })
    .from(chatPinnedMessages)
    .innerJoin(users, eq(users.id, chatPinnedMessages.pinnedBy))
    .where(eq(chatPinnedMessages.channelId, channelId))
    .orderBy(desc(chatPinnedMessages.createdAt));

  const messages = await getChatMessagesByIds(
    channelId,
    pinnedRows.map((row) => row.messageId),
    userId
  );

  const messageById = new Map(messages.map((message) => [message.id, message]));

  return pinnedRows
    .map((row) => ({
      id: row.id,
      messageId: row.messageId,
      pinnedBy: row.pinnedBy,
      pinnedByName: row.pinnedByName,
      pinnedAt: row.pinnedAt.toISOString(),
      message: messageById.get(row.messageId) ?? null,
    }))
    .filter((row) => row.message !== null);
}

export async function markChatChannelReadModel(data: {
  channelId: string;
  userId: string;
  lastReadMessageId: number | null;
}) {
  await db
    .insert(chatChannelMembers)
    .values({
      channelId: data.channelId,
      userId: data.userId,
      lastReadMessageId: data.lastReadMessageId,
    })
    .onConflictDoUpdate({
      target: [chatChannelMembers.channelId, chatChannelMembers.userId],
      set: { lastReadMessageId: data.lastReadMessageId },
    });

  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.recipientUserId, data.userId),
        eq(notifications.channelId, data.channelId),
        isNull(notifications.readAt),
        inArray(notifications.type, [
          "chat_mention",
          "chat_reply",
          "chat_dm",
          "channel_invite",
        ])
      )
    );

  return true;
}

/* -------------------------------------------------------------------------- */
/*                                  NOTIFICATIONS                             */
/* -------------------------------------------------------------------------- */

export async function insertChatNotificationModel(data: {
  workspaceId: string;
  recipientUserId: string;
  senderUserId: string;
  type: "chat_mention" | "chat_reply" | "chat_dm" | "channel_invite";
  channelId: string;
  messageId?: number;
}) {
  const [notification] = await db
    .insert(notifications)
    .values({
      workspaceId: data.workspaceId,
      recipientUserId: data.recipientUserId,
      senderUserId: data.senderUserId,
      type: data.type,
      channelId: data.channelId,
      messageId: data.messageId,
    })
    .returning({ id: notifications.id });

  return notification;
}

export async function getChatUnreadSummaryModel(workspaceId: string, userId: string) {
  const { channels } = await getChatChannelsModel(workspaceId, userId);

  return channels.reduce<ChatUnreadSummary>(
    (summary, channel) => ({
      totalUnread: summary.totalUnread + channel.unreadCount,
      totalMentions: summary.totalMentions + channel.mentionCount,
    }),
    { totalUnread: 0, totalMentions: 0 }
  );
}

/* -------------------------------------------------------------------------- */
/*                                   SEARCH                                   */
/* -------------------------------------------------------------------------- */

export async function searchChatModel(workspaceId: string, userId: string, query: string) {
  const membershipRows = await db
    .select({ channelId: chatChannelMembers.channelId })
    .from(chatChannelMembers)
    .where(eq(chatChannelMembers.userId, userId));

  const publicRows = await db
    .select({ id: chatChannels.id })
    .from(chatChannels)
    .where(
      and(
        eq(chatChannels.workspaceId, workspaceId),
        eq(chatChannels.visibility, "public")
      )
    );

  const accessibleIds = Array.from(
    new Set([
      ...membershipRows.map((row) => row.channelId),
      ...publicRows.map((row) => row.id),
    ])
  );

  const pattern = `%${query}%`;

  const [messageRows, channelRows, peopleRows, workspaceMemberCount] =
    await Promise.all([
      accessibleIds.length > 0
        ? db
            .select({
              id: chatMessages.id,
              channelId: chatMessages.channelId,
              senderId: chatMessages.senderId,
              senderName: users.name,
              senderEmail: users.email,
              senderAvatar: users.avatar,
              content: chatMessages.content,
              replyToMessageId: chatMessages.replyToMessageId,
              editedAt: chatMessages.editedAt,
              deletedAt: chatMessages.deletedAt,
              createdAt: chatMessages.createdAt,
              updatedAt: chatMessages.updatedAt,
            })
            .from(chatMessages)
            .innerJoin(users, eq(users.id, chatMessages.senderId))
            .where(
              and(
                inArray(chatMessages.channelId, accessibleIds),
                ilike(chatMessages.content, pattern),
                isNull(chatMessages.deletedAt)
              )
            )
            .orderBy(desc(chatMessages.id))
            .limit(25)
        : Promise.resolve([] as MessageRow[]),
      db
        .select({
          id: chatChannels.id,
          name: chatChannels.name,
          type: chatChannels.type,
          visibility: chatChannels.visibility,
        })
        .from(chatChannels)
        .where(
          and(
            eq(chatChannels.workspaceId, workspaceId),
            ilike(chatChannels.name, pattern),
            isNull(chatChannels.archivedAt)
          )
        )
        .orderBy(chatChannels.name)
        .limit(10),
      db
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          avatar: users.avatar,
          role: workspaceMembers.role,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(users.id, workspaceMembers.userId))
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            or(ilike(users.name, pattern), ilike(users.email, pattern))
          )
        )
        .orderBy(users.name)
        .limit(10),
      getWorkspaceMemberCountModel(workspaceId),
    ]);

  const accessibleSet = new Set(accessibleIds);

  const hydratedMessages = await hydrateMessages(userId, messageRows);

  const channelMemberCounts = await db
    .select({
      channelId: chatChannelMembers.channelId,
      value: count(),
    })
    .from(chatChannelMembers)
    .where(
      inArray(
        chatChannelMembers.channelId,
        channelRows.map((row) => row.id)
      )
    )
    .groupBy(chatChannelMembers.channelId);

  const channelMemberCountByChannel = new Map(
    channelMemberCounts.map((row) => [row.channelId, Number(row.value)])
  );

  return {
    messages: hydratedMessages,
    channels: channelRows.map((channel) => ({
      id: channel.id,
      name: channel.name,
      type: channel.type as ChatChannelType,
      visibility: channel.visibility as ChatChannelVisibility,
      memberCount:
        channel.visibility === "public"
          ? workspaceMemberCount
          : channelMemberCountByChannel.get(channel.id) ?? 0,
      isMember: accessibleSet.has(channel.id),
    })),
    people: peopleRows.map((person) => ({
      userId: person.userId,
      name: person.name,
      email: person.email,
      avatar: person.avatar,
      role: person.role,
    })),
  } satisfies ChatSearchResults;
}