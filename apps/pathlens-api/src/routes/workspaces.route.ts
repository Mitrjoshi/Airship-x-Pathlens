import { Router } from "express";

import {
  createPermissionProfile,
  createWorkspace,
  createWorkspaceInvitation,
  deletePermissionProfile,
  deleteWorkspace,
  getPermissionProfiles,
  getUserWorkspacesController,
  getWorkspaceMembers,
  getWorkspacePendingInvitations,
  getWorkspaceUsage,
  removeWorkspaceMember,
  updatePermissionProfile,
  updateWorkspace,
  updateWorkspaceMember,
} from "../controllers/workspace.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getUserWorkspacesController);
router.post("/", createWorkspace);
router.patch("/:workspace_id", updateWorkspace);
router.delete("/:workspace_id", deleteWorkspace);
router.get("/:workspace_id/members", getWorkspaceMembers);
router.get("/:workspace_id/usage", getWorkspaceUsage);
router.get("/:workspace_id/invitations", getWorkspacePendingInvitations);
router.get("/:workspace_id/permission-profiles", getPermissionProfiles);
router.post("/:workspace_id/permission-profiles", createPermissionProfile);
router.patch(
  "/:workspace_id/permission-profiles/:profile_id",
  updatePermissionProfile
);
router.delete(
  "/:workspace_id/permission-profiles/:profile_id",
  deletePermissionProfile
);
router.patch("/:workspace_id/members/:user_id", updateWorkspaceMember);
router.delete("/:workspace_id/members/:user_id", removeWorkspaceMember);
router.post("/:workspace_id/invitations", createWorkspaceInvitation);

export default router;
