import { Response } from "express";
import { z, ZodError } from "zod";
import { PERMISSIONS, type Permission } from "@workspace/contracts";

import {
  createPermissionProfileModel,
  createWorkspaceInvitationModel,
  createWorkspaceModel,
  deletePermissionProfileModel,
  deleteWorkspaceModel,
  getPermissionProfileModel,
  getPermissionProfileUsageModel,
  getPermissionProfilesModel,
  getWorkspaceAccessModel,
  getWorkspaceMemberModel,
  getWorkspaceMembersModel,
  getWorkspacePendingInvitationsModel,
  getWorkspaces,
  removeWorkspaceMemberModel,
  hasWorkspacePermission,
  updatePermissionProfileModel,
  updateWorkspaceModel,
  updateWorkspaceMemberModel,
} from "../models/workshop.model";
import { getWorkspaceUsageModel } from "../models/usage.model";
import { getUserByEmailModel } from "../models/users.model";
import { AuthRequest } from "../lib/jwt";

const workspaceParamsSchema = z.object({
  workspace_id: z.string().min(1, "Workspace id is required."),
});

const createWorkspaceSchema = z.object({
  name: z
    .string({ error: "Workspace name is required." })
    .trim()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(80, "Workspace name must be 80 characters or less."),
});

const createInvitationSchema = z.object({
  email: z.email("A valid user email is required."),
  permissionProfileId: z.uuid("A permission profile is required."),
});

const memberParamsSchema = z.object({
  workspace_id: z.string().min(1, "Workspace id is required."),
  user_id: z.string().min(1, "User id is required."),
});

const updateMemberSchema = z.object({
  permissionProfileId: z.uuid("A permission profile is required."),
});

const permissionProfileParamsSchema = z.object({
  workspace_id: z.string().min(1, "Workspace id is required."),
  profile_id: z.uuid("Permission profile id is required."),
});

const permissionSchema = z.enum(PERMISSIONS);

const permissionProfileSchema = z.object({
  name: z
    .string({ error: "Permission profile name is required." })
    .trim()
    .min(2, "Permission profile name must be at least 2 characters.")
    .max(60, "Permission profile name must be 60 characters or less."),
  description: z
    .string()
    .trim()
    .max(160, "Description must be 160 characters or less.")
    .nullable()
    .optional()
    .transform((value) => value || null),
  permissions: z
    .array(permissionSchema)
    .min(1, "Select at least one permission.")
    .max(PERMISSIONS.length)
    .refine((permissions) => new Set(permissions).size === permissions.length, {
      message: "Permissions cannot be duplicated.",
    }),
});

function getAuthenticatedUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

async function requireWorkspacePermission(
  workspaceId: string,
  userId: string,
  ...permissions: Permission[]
) {
  const member = await getWorkspaceAccessModel(workspaceId, userId);

  if (
    !member ||
    !permissions.some((permission) =>
      hasWorkspacePermission(member, permission)
    )
  ) {
    return null;
  }

  return member;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Validation failed.";
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong.";
}

export async function getUserWorkspacesController(
  req: AuthRequest,
  res: Response
) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const workspaces = await getWorkspaces(userId);

    return res.status(200).json({
      success: true,
      data: workspaces,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function createWorkspace(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { name } = createWorkspaceSchema.parse(req.body);
    const [workspace] = await createWorkspaceModel({
      user_id: userId,
      name,
    });

    return res.status(201).json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function updateWorkspace(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id } = workspaceParamsSchema.parse(req.params);
    const member = await requireWorkspacePermission(
      workspace_id,
      userId,
      "workspace.settings.update"
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update workspace settings.",
      });
    }

    const { name } = createWorkspaceSchema.parse(req.body ?? {});
    const workspace = await updateWorkspaceModel({
      workspaceId: workspace_id,
      name,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function deleteWorkspace(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id } = workspaceParamsSchema.parse(req.params);
    const member = await requireWorkspacePermission(
      workspace_id,
      userId,
      "workspace.delete"
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this workspace.",
      });
    }

    const workspace = await deleteWorkspaceModel(workspace_id);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: workspace,
    });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function getWorkspaceMembers(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id } = workspaceParamsSchema.parse(req.params);
    const member = await requireWorkspacePermission(
      workspace_id,
      userId,
      "workspace.members.view"
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this workspace.",
      });
    }

    const members = await getWorkspaceMembersModel(workspace_id);

    return res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function getWorkspaceUsage(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id } = workspaceParamsSchema.parse(req.params);
    const member = await requireWorkspacePermission(
      workspace_id,
      userId,
      "workspace.view"
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this workspace.",
      });
    }

    const usage = await getWorkspaceUsageModel(workspace_id, userId);

    return res.status(200).json({
      success: true,
      data: usage,
    });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function getWorkspacePendingInvitations(
  req: AuthRequest,
  res: Response
) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id } = workspaceParamsSchema.parse(req.params);
    const member = await requireWorkspacePermission(
      workspace_id,
      userId,
      "workspace.members.view"
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this workspace.",
      });
    }

    const invitations = await getWorkspacePendingInvitationsModel(workspace_id);

    return res.status(200).json({
      success: true,
      data: invitations,
    });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

async function getManageableMember(
  workspaceId: string,
  actorId: string,
  targetId: string,
  permission: Permission
) {
  const actor = await requireWorkspacePermission(
    workspaceId,
    actorId,
    permission
  );

  if (!actor) return { error: "You do not have permission to manage members." };

  const target = await getWorkspaceMemberModel(workspaceId, targetId);

  if (!target) return { error: "Workspace member not found." };
  if (target.role === "owner") {
    return { error: "The workspace owner cannot be changed or removed." };
  }
  return { actor, target };
}

export async function updateWorkspaceMember(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id, user_id } = memberParamsSchema.parse(req.params);
    const { permissionProfileId } = updateMemberSchema.parse(req.body ?? {});
    const manageableMember = await getManageableMember(
      workspace_id,
      userId,
      user_id,
      "workspace.members.update"
    );

    if ("error" in manageableMember) {
      return res.status(403).json({
        success: false,
        message: manageableMember.error,
      });
    }

    const member = await updateWorkspaceMemberModel({
      workspaceId: workspace_id,
      userId: user_id,
      permissionProfileId,
    });

    return res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function removeWorkspaceMember(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id, user_id } = memberParamsSchema.parse(req.params);
    const manageableMember = await getManageableMember(
      workspace_id,
      userId,
      user_id,
      "workspace.members.remove"
    );

    if ("error" in manageableMember) {
      return res.status(403).json({
        success: false,
        message: manageableMember.error,
      });
    }

    await removeWorkspaceMemberModel({
      workspaceId: workspace_id,
      userId: user_id,
    });

    return res.status(200).json({
      success: true,
      message: "Workspace member removed.",
    });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function createWorkspaceInvitation(
  req: AuthRequest,
  res: Response
) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id } = workspaceParamsSchema.parse(req.params);
    const { email, permissionProfileId } = createInvitationSchema.parse(
      req.body ?? {}
    );
    const member = await requireWorkspacePermission(
      workspace_id,
      userId,
      "workspace.members.invite"
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to invite members.",
      });
    }

    const recipient = await getUserByEmailModel(email);

    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: "That user does not have a PathLens account yet.",
      });
    }

    if (recipient.id === userId) {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this workspace.",
      });
    }

    const recipientMember = await getWorkspaceMemberModel(
      workspace_id,
      recipient.id
    );

    if (recipientMember) {
      return res.status(409).json({
        success: false,
        message: "That user is already a member of this workspace.",
      });
    }

    const permissionProfile = await getPermissionProfileModel(
      workspace_id,
      permissionProfileId
    );

    if (!permissionProfile) {
      return res.status(404).json({
        success: false,
        message: "Permission profile not found.",
      });
    }

    const notification = await createWorkspaceInvitationModel({
      workspaceId: workspace_id,
      recipientUserId: recipient.id,
      senderUserId: userId,
      permissionProfileId: permissionProfile.id,
    });

    return res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function getPermissionProfiles(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id } = workspaceParamsSchema.parse(req.params);
    const member = await requireWorkspacePermission(
      workspace_id,
      userId,
      "workspace.permission_profiles.view",
      "workspace.permission_profiles.create",
      "workspace.permission_profiles.update",
      "workspace.permission_profiles.delete"
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view permission profiles.",
      });
    }

    const profiles = await getPermissionProfilesModel(workspace_id);

    return res.status(200).json({ success: true, data: profiles });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function createPermissionProfile(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id } = workspaceParamsSchema.parse(req.params);
    const member = await requireWorkspacePermission(
      workspace_id,
      userId,
      "workspace.permission_profiles.create"
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to create permission profiles.",
      });
    }

    const payload = permissionProfileSchema.parse(req.body ?? {});
    const profile = await createPermissionProfileModel({
      workspaceId: workspace_id,
      name: payload.name,
      description: payload.description,
      permissions: payload.permissions,
    });

    return res.status(201).json({ success: true, data: profile });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function updatePermissionProfile(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id, profile_id } = permissionProfileParamsSchema.parse(
      req.params
    );
    const member = await requireWorkspacePermission(
      workspace_id,
      userId,
      "workspace.permission_profiles.update"
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to edit permission profiles.",
      });
    }

    const existingProfile = await getPermissionProfileModel(
      workspace_id,
      profile_id
    );

    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        message: "Permission profile not found.",
      });
    }

    if (existingProfile.isSystem) {
      return res.status(409).json({
        success: false,
        message: "Built-in permission profiles cannot be edited.",
      });
    }

    const payload = permissionProfileSchema.parse(req.body ?? {});
    const profile = await updatePermissionProfileModel({
      workspaceId: workspace_id,
      profileId: profile_id,
      name: payload.name,
      description: payload.description,
      permissions: payload.permissions,
    });

    return res.status(200).json({ success: true, data: profile });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function deletePermissionProfile(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { workspace_id, profile_id } = permissionProfileParamsSchema.parse(
      req.params
    );
    const member = await requireWorkspacePermission(
      workspace_id,
      userId,
      "workspace.permission_profiles.delete"
    );

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete permission profiles.",
      });
    }

    const existingProfile = await getPermissionProfileModel(
      workspace_id,
      profile_id
    );

    if (!existingProfile) {
      return res.status(404).json({
        success: false,
        message: "Permission profile not found.",
      });
    }

    if (existingProfile.isSystem) {
      return res.status(409).json({
        success: false,
        message: "Built-in permission profiles cannot be deleted.",
      });
    }

    const usage = await getPermissionProfileUsageModel(
      workspace_id,
      profile_id
    );

    if (usage.memberCount > 0 || usage.pendingInvitationCount > 0) {
      return res.status(409).json({
        success: false,
        message:
          "Reassign members and pending invitations before deleting this profile.",
      });
    }

    await deletePermissionProfileModel({
      workspaceId: workspace_id,
      profileId: profile_id,
    });

    return res.status(200).json({
      success: true,
      message: "Permission profile deleted.",
    });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}
