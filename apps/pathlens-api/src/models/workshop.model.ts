import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "../db/client";
import {
  notifications,
  projects,
  users,
  workspaceMembers,
  workspaces,
} from "../db/schema";

export async function createWorkspaceModel(data: {
  user_id: string;
  name: string;
}): Promise<{ id: string; name: string }[]> {
  return await db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: data.name,
        userId: data.user_id,
        isDefault: false,
      })
      .returning({ id: workspaces.id, name: workspaces.name });

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: data.user_id,
      role: "owner",
    });

    return [workspace];
  });
}

export async function updateWorkspaceModel(data: {
  workspaceId: string;
  name: string;
}) {
  const [workspace] = await db
    .update(workspaces)
    .set({ name: data.name })
    .where(eq(workspaces.id, data.workspaceId))
    .returning({
      id: workspaces.id,
      name: workspaces.name,
    });

  return workspace;
}

export async function deleteWorkspaceModel(workspaceId: string) {
  const [workspace] = await db
    .delete(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .returning({ id: workspaces.id });

  return workspace;
}

export async function createDefaultWorkspaceModel(data: {
  user_id: string;
}): Promise<{ id: string }[]> {
  return await db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({
        name: "Default Workspace",
        userId: data.user_id,
        isDefault: true,
      })
      .returning({ id: workspaces.id });

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: data.user_id,
      role: "owner",
    });

    return [workspace];
  });
}

export async function getDefaultWorkspace(user_id: string) {
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(and(eq(workspaces.userId, user_id), eq(workspaces.isDefault, true)));

  return workspace;
}

export async function getWorkspaces(user_id: string) {
  return await db
    .select({
      id: workspaces.id,
      userId: workspaces.userId,
      name: workspaces.name,
      isDefault: workspaces.isDefault,
      createdAt: workspaces.createdAt,
      role: workspaceMembers.role,
      projectCount: db.$count(
        projects,
        eq(projects.workspaceId, workspaces.id)
      ),
      memberCount: db.$count(
        workspaceMembers,
        eq(workspaceMembers.workspaceId, workspaces.id)
      ),
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, user_id))
    .orderBy(desc(workspaces.isDefault), desc(workspaces.createdAt));
}

export async function getWorkspaceMemberModel(
  workspaceId: string,
  userId: string
) {
  const [member] = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    );

  return member;
}

export async function getWorkspaceMembersModel(workspaceId: string) {
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(desc(workspaceMembers.createdAt));
}

export async function getWorkspacePendingInvitationsModel(workspaceId: string) {
  return await db
    .select({
      id: notifications.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: notifications.role,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.recipientUserId))
    .where(
      and(
        eq(notifications.workspaceId, workspaceId),
        eq(notifications.type, "workspace_invite"),
        isNull(notifications.acceptedAt)
      )
    )
    .orderBy(desc(notifications.createdAt));
}

export async function updateWorkspaceMemberModel(data: {
  workspaceId: string;
  userId: string;
  role: string;
}) {
  const [member] = await db
    .update(workspaceMembers)
    .set({ role: data.role })
    .where(
      and(
        eq(workspaceMembers.workspaceId, data.workspaceId),
        eq(workspaceMembers.userId, data.userId)
      )
    )
    .returning({
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    });

  return member;
}

export async function removeWorkspaceMemberModel(data: {
  workspaceId: string;
  userId: string;
}) {
  const [member] = await db
    .delete(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, data.workspaceId),
        eq(workspaceMembers.userId, data.userId)
      )
    )
    .returning({
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
    });

  return member;
}

export async function createWorkspaceInvitationModel(data: {
  workspaceId: string;
  recipientUserId: string;
  senderUserId: string;
  role: string;
}) {
  const [notification] = await db
    .insert(notifications)
    .values({
      workspaceId: data.workspaceId,
      recipientUserId: data.recipientUserId,
      senderUserId: data.senderUserId,
      type: "workspace_invite",
      role: data.role,
    })
    .returning({
      id: notifications.id,
      createdAt: notifications.createdAt,
    });

  return notification;
}

export async function getUserNotificationsModel(userId: string) {
  return await db
    .select({
      id: notifications.id,
      type: notifications.type,
      role: notifications.role,
      workspaceId: notifications.workspaceId,
      workspaceName: workspaces.name,
      senderName: users.name,
      senderEmail: users.email,
      readAt: notifications.readAt,
      acceptedAt: notifications.acceptedAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .innerJoin(workspaces, eq(workspaces.id, notifications.workspaceId))
    .innerJoin(users, eq(users.id, notifications.senderUserId))
    .where(eq(notifications.recipientUserId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function acceptWorkspaceNotificationModel(data: {
  notificationId: string;
  userId: string;
}) {
  return await db.transaction(async (tx) => {
    const [notification] = await tx
      .select({
        id: notifications.id,
        workspaceId: notifications.workspaceId,
        role: notifications.role,
        type: notifications.type,
        acceptedAt: notifications.acceptedAt,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.id, data.notificationId),
          eq(notifications.recipientUserId, data.userId)
        )
      );

    if (!notification) throw new Error("Notification not found.");
    if (notification.type !== "workspace_invite") {
      throw new Error("This notification cannot be accepted.");
    }
    if (notification.acceptedAt) {
      throw new Error("This workspace invitation has already been accepted.");
    }

    await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: notification.workspaceId,
        userId: data.userId,
        role: notification.role,
      })
      .onConflictDoNothing();

    await tx
      .update(notifications)
      .set({ acceptedAt: new Date(), readAt: new Date() })
      .where(
        and(
          eq(notifications.id, notification.id),
          isNull(notifications.acceptedAt)
        )
      );

    return {
      workspaceId: notification.workspaceId,
      role: notification.role,
    };
  });
}
