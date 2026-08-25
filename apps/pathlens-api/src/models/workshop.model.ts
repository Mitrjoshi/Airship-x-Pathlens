import { and, desc, eq, isNull } from "drizzle-orm";
import {
  DEFAULT_FULL_ACCESS_PERMISSIONS,
  DEFAULT_VIEWER_PERMISSIONS,
  isPermission,
  type Permission,
} from "@workspace/contracts";

import { db } from "../db/client";
import {
  chatChannels,
  chatMessages,
  notifications,
  permissionProfiles,
  projects,
  users,
  workspaceMembers,
  workspaces,
} from "../db/schema";

export type WorkspaceAccess = {
  workspaceId: string;
  userId: string;
  role: string;
  permissionProfileId: string | null;
  permissionProfileName: string | null;
  permissions: Permission[];
};

function normalizePermissions(value: Permission[] | null | undefined) {
  return (Array.isArray(value) ? value : []).filter(isPermission);
}

function getDefaultProfiles(workspaceId: string) {
  return [
    {
      workspaceId,
      name: "Full access",
      description: "Can access and manage every workspace feature.",
      permissions: [...DEFAULT_FULL_ACCESS_PERMISSIONS],
      isSystem: true,
    },
    {
      workspaceId,
      name: "Viewer",
      description: "Can view workspace data without changing configuration.",
      permissions: [...DEFAULT_VIEWER_PERMISSIONS],
      isSystem: true,
    },
  ];
}

async function seedDefaultProfiles(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  workspaceId: string
) {
  return tx
    .insert(permissionProfiles)
    .values(getDefaultProfiles(workspaceId))
    .returning({ id: permissionProfiles.id, name: permissionProfiles.name });
}

export async function ensureWorkspacePermissionProfilesModel(
  workspaceId: string
) {
  const existingProfiles = await db
    .select({ id: permissionProfiles.id, name: permissionProfiles.name })
    .from(permissionProfiles)
    .where(eq(permissionProfiles.workspaceId, workspaceId));

  if (existingProfiles.length > 0) return existingProfiles;

  return await db.transaction(async (tx) => {
    const profiles = await seedDefaultProfiles(tx, workspaceId);
    const fullAccessProfile = profiles.find(
      (profile) => profile.name === "Full access"
    );
    const viewerProfile = profiles.find((profile) => profile.name === "Viewer");

    const members = await tx
      .select({
        userId: workspaceMembers.userId,
        role: workspaceMembers.role,
        permissionProfileId: workspaceMembers.permissionProfileId,
      })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));

    for (const member of members) {
      if (member.permissionProfileId) continue;

      await tx
        .update(workspaceMembers)
        .set({
          permissionProfileId:
            member.role === "admin" ? fullAccessProfile?.id : viewerProfile?.id,
        })
        .where(
          and(
            eq(workspaceMembers.workspaceId, workspaceId),
            eq(workspaceMembers.userId, member.userId)
          )
        );
    }

    const invitations = await tx
      .select({
        id: notifications.id,
        role: notifications.role,
        permissionProfileId: notifications.permissionProfileId,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.workspaceId, workspaceId),
          isNull(notifications.permissionProfileId)
        )
      );

    for (const invitation of invitations) {
      await tx
        .update(notifications)
        .set({
          permissionProfileId:
            invitation.role === "admin"
              ? fullAccessProfile?.id
              : viewerProfile?.id,
        })
        .where(eq(notifications.id, invitation.id));
    }

    return profiles;
  });
}

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

    const profiles = await seedDefaultProfiles(tx, workspace.id);
    const fullAccessProfile = profiles.find(
      (profile) => profile.name === "Full access"
    );

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: data.user_id,
      role: "owner",
      permissionProfileId: fullAccessProfile?.id,
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

    const profiles = await seedDefaultProfiles(tx, workspace.id);
    const fullAccessProfile = profiles.find(
      (profile) => profile.name === "Full access"
    );

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace?.id,
      userId: data.user_id,
      role: "owner",
      permissionProfileId: fullAccessProfile?.id,
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
  const memberships = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, user_id));

  await Promise.all(
    memberships.map((membership) =>
      ensureWorkspacePermissionProfilesModel(membership.workspaceId)
    )
  );

  const workspacesResult = await db
    .select({
      id: workspaces.id,
      userId: workspaces.userId,
      name: workspaces.name,
      isDefault: workspaces.isDefault,
      createdAt: workspaces.createdAt,
      role: workspaceMembers.role,
      permissionProfileId: workspaceMembers.permissionProfileId,
      permissionProfileName: permissionProfiles.name,
      permissions: permissionProfiles.permissions,
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
    .leftJoin(
      permissionProfiles,
      eq(permissionProfiles.id, workspaceMembers.permissionProfileId)
    )
    .where(eq(workspaceMembers.userId, user_id))
    .orderBy(desc(workspaces.isDefault), desc(workspaces.createdAt));

  return workspacesResult.map((workspace) => ({
    ...workspace,
    permissions:
      workspace.role === "owner"
        ? [...DEFAULT_FULL_ACCESS_PERMISSIONS]
        : normalizePermissions(workspace.permissions),
  }));
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

export async function getWorkspaceAccessModel(
  workspaceId: string,
  userId: string
): Promise<WorkspaceAccess | null> {
  await ensureWorkspacePermissionProfilesModel(workspaceId);

  const [member] = await db
    .select({
      workspaceId: workspaceMembers.workspaceId,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      permissionProfileId: workspaceMembers.permissionProfileId,
      permissionProfileName: permissionProfiles.name,
      permissions: permissionProfiles.permissions,
    })
    .from(workspaceMembers)
    .leftJoin(
      permissionProfiles,
      eq(permissionProfiles.id, workspaceMembers.permissionProfileId)
    )
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    );

  if (!member) return null;

  return {
    ...member,
    permissions:
      member.role === "owner"
        ? [...DEFAULT_FULL_ACCESS_PERMISSIONS]
        : normalizePermissions(member.permissions),
  };
}

export function hasWorkspacePermission(
  access: WorkspaceAccess,
  permission: Permission
) {
  return access.role === "owner" || access.permissions.includes(permission);
}

export async function getPermissionProfilesModel(workspaceId: string) {
  await ensureWorkspacePermissionProfilesModel(workspaceId);

  return await db
    .select({
      id: permissionProfiles.id,
      workspaceId: permissionProfiles.workspaceId,
      name: permissionProfiles.name,
      description: permissionProfiles.description,
      permissions: permissionProfiles.permissions,
      isSystem: permissionProfiles.isSystem,
      createdAt: permissionProfiles.createdAt,
      updatedAt: permissionProfiles.updatedAt,
      memberCount: db.$count(
        workspaceMembers,
        eq(workspaceMembers.permissionProfileId, permissionProfiles.id)
      ),
      pendingInvitationCount: db.$count(
        notifications,
        eq(notifications.permissionProfileId, permissionProfiles.id)
      ),
    })
    .from(permissionProfiles)
    .where(eq(permissionProfiles.workspaceId, workspaceId))
    .orderBy(permissionProfiles.name);
}

export async function getPermissionProfileModel(
  workspaceId: string,
  profileId: string
) {
  const [profile] = await db
    .select()
    .from(permissionProfiles)
    .where(
      and(
        eq(permissionProfiles.workspaceId, workspaceId),
        eq(permissionProfiles.id, profileId)
      )
    );

  return profile;
}

export async function getPermissionProfileUsageModel(
  workspaceId: string,
  profileId: string
) {
  const [usage] = await db
    .select({
      memberCount: db.$count(
        workspaceMembers,
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.permissionProfileId, profileId)
        )
      ),
      pendingInvitationCount: db.$count(
        notifications,
        and(
          eq(notifications.workspaceId, workspaceId),
          eq(notifications.permissionProfileId, profileId),
          isNull(notifications.acceptedAt)
        )
      ),
    })
    .from(permissionProfiles)
    .where(
      and(
        eq(permissionProfiles.workspaceId, workspaceId),
        eq(permissionProfiles.id, profileId)
      )
    );

  return {
    memberCount: Number(usage?.memberCount ?? 0),
    pendingInvitationCount: Number(usage?.pendingInvitationCount ?? 0),
  };
}

export async function createPermissionProfileModel(data: {
  workspaceId: string;
  name: string;
  description: string | null;
  permissions: Permission[];
}) {
  const [profile] = await db
    .insert(permissionProfiles)
    .values({
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description,
      permissions: data.permissions,
    })
    .returning();

  return profile;
}

export async function updatePermissionProfileModel(data: {
  workspaceId: string;
  profileId: string;
  name: string;
  description: string | null;
  permissions: Permission[];
}) {
  const [profile] = await db
    .update(permissionProfiles)
    .set({
      name: data.name,
      description: data.description,
      permissions: data.permissions,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(permissionProfiles.workspaceId, data.workspaceId),
        eq(permissionProfiles.id, data.profileId)
      )
    )
    .returning();

  return profile;
}

export async function deletePermissionProfileModel(data: {
  workspaceId: string;
  profileId: string;
}) {
  const [profile] = await db
    .delete(permissionProfiles)
    .where(
      and(
        eq(permissionProfiles.workspaceId, data.workspaceId),
        eq(permissionProfiles.id, data.profileId)
      )
    )
    .returning({ id: permissionProfiles.id });

  return profile;
}

export async function getWorkspaceMembersModel(workspaceId: string) {
  return await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar: users.avatar,
      role: workspaceMembers.role,
      permissionProfileId: workspaceMembers.permissionProfileId,
      permissionProfileName: permissionProfiles.name,
      joinedAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .leftJoin(
      permissionProfiles,
      eq(permissionProfiles.id, workspaceMembers.permissionProfileId)
    )
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
      permissionProfileId: notifications.permissionProfileId,
      permissionProfileName: permissionProfiles.name,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .innerJoin(users, eq(users.id, notifications.recipientUserId))
    .leftJoin(
      permissionProfiles,
      eq(permissionProfiles.id, notifications.permissionProfileId)
    )
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
  permissionProfileId: string;
}) {
  const [member] = await db
    .update(workspaceMembers)
    .set({
      role: "member",
      permissionProfileId: data.permissionProfileId,
    })
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
      permissionProfileId: workspaceMembers.permissionProfileId,
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
  permissionProfileId: string;
}) {
  const [notification] = await db
    .insert(notifications)
    .values({
      workspaceId: data.workspaceId,
      recipientUserId: data.recipientUserId,
      senderUserId: data.senderUserId,
      type: "workspace_invite",
      role: "member",
      permissionProfileId: data.permissionProfileId,
    })
    .returning({
      id: notifications.id,
      createdAt: notifications.createdAt,
    });

  return notification;
}

export async function getUserNotificationsModel(userId: string) {
  const workspaceRows = await db
    .select({ workspaceId: notifications.workspaceId })
    .from(notifications)
    .where(eq(notifications.recipientUserId, userId));

  await Promise.all(
    workspaceRows.map((row) =>
      ensureWorkspacePermissionProfilesModel(row.workspaceId)
    )
  );

  return await db
    .select({
      id: notifications.id,
      type: notifications.type,
      role: notifications.role,
      permissionProfileId: notifications.permissionProfileId,
      permissionProfileName: permissionProfiles.name,
      workspaceId: notifications.workspaceId,
      workspaceName: workspaces.name,
      channelId: notifications.channelId,
      channelName: chatChannels.name,
      messageId: notifications.messageId,
      messagePreview: chatMessages.content,
      senderName: users.name,
      senderEmail: users.email,
      readAt: notifications.readAt,
      acceptedAt: notifications.acceptedAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .innerJoin(workspaces, eq(workspaces.id, notifications.workspaceId))
    .innerJoin(users, eq(users.id, notifications.senderUserId))
    .leftJoin(
      permissionProfiles,
      eq(permissionProfiles.id, notifications.permissionProfileId)
    )
    .leftJoin(chatChannels, eq(chatChannels.id, notifications.channelId))
    .leftJoin(chatMessages, eq(chatMessages.id, notifications.messageId))
    .where(eq(notifications.recipientUserId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function markNotificationReadModel(data: {
  notificationId: string;
  userId: string;
}) {
  const [notification] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.id, data.notificationId),
        eq(notifications.recipientUserId, data.userId),
        isNull(notifications.readAt)
      )
    )
    .returning({ id: notifications.id });

  return notification ?? null;
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
        permissionProfileId: notifications.permissionProfileId,
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

    if (!notification.permissionProfileId) {
      throw new Error("This workspace invitation has no permission profile.");
    }

    await tx
      .insert(workspaceMembers)
      .values({
        workspaceId: notification.workspaceId,
        userId: data.userId,
        role: "member",
        permissionProfileId: notification.permissionProfileId,
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
      permissionProfileId: notification.permissionProfileId,
    };
  });
}
