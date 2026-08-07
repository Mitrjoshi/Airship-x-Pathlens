import { Response } from "express";
import { z, ZodError } from "zod";

import {
  createWorkspaceInvitationModel,
  createWorkspaceModel,
  deleteWorkspaceModel,
  getWorkspaceMemberModel,
  getWorkspaceMembersModel,
  getWorkspacePendingInvitationsModel,
  getWorkspaces,
  removeWorkspaceMemberModel,
  updateWorkspaceModel,
  updateWorkspaceMemberModel,
} from "../models/workshop.model";
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
  role: z.enum(["admin", "member"]).default("member"),
});

const memberParamsSchema = z.object({
  workspace_id: z.string().min(1, "Workspace id is required."),
  user_id: z.string().min(1, "User id is required."),
});

const updateMemberSchema = z.object({
  role: z.enum(["admin", "member"]),
});

function getAuthenticatedUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

async function requireWorkspaceRole(
  workspaceId: string,
  userId: string,
  roles: string[]
) {
  const member = await getWorkspaceMemberModel(workspaceId, userId);

  if (!member || !roles.includes(member.role)) return null;

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
    const member = await requireWorkspaceRole(workspace_id, userId, [
      "owner",
      "admin",
    ]);

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "Only workspace admins can update workspace settings.",
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
    const member = await requireWorkspaceRole(workspace_id, userId, ["owner"]);

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "Only the workspace owner can delete this workspace.",
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
    const member = await requireWorkspaceRole(workspace_id, userId, [
      "owner",
      "admin",
      "member",
    ]);

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
    const member = await requireWorkspaceRole(workspace_id, userId, [
      "owner",
      "admin",
      "member",
    ]);

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
  targetId: string
) {
  const actor = await requireWorkspaceRole(workspaceId, actorId, [
    "owner",
    "admin",
  ]);

  if (!actor) return { error: "Only workspace admins can manage members." };

  const target = await getWorkspaceMemberModel(workspaceId, targetId);

  if (!target) return { error: "Workspace member not found." };
  if (target.role === "owner") {
    return { error: "The workspace owner cannot be changed or removed." };
  }
  if (actor.role === "admin" && target.role === "admin") {
    return { error: "Admins cannot manage other admins." };
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
    const { role } = updateMemberSchema.parse(req.body ?? {});
    const manageableMember = await getManageableMember(
      workspace_id,
      userId,
      user_id
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
      role,
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
      user_id
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
    const { email, role } = createInvitationSchema.parse(req.body ?? {});
    const member = await requireWorkspaceRole(workspace_id, userId, [
      "owner",
      "admin",
    ]);

    if (!member) {
      return res.status(403).json({
        success: false,
        message: "Only workspace admins can invite members.",
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

    const notification = await createWorkspaceInvitationModel({
      workspaceId: workspace_id,
      recipientUserId: recipient.id,
      senderUserId: userId,
      role,
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
