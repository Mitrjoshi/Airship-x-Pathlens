import { Router } from "express";

import {
  createWorkspace,
  createWorkspaceInvitation,
  deleteWorkspace,
  getUserWorkspacesController,
  getWorkspaceMembers,
  getWorkspacePendingInvitations,
  removeWorkspaceMember,
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
router.get("/:workspace_id/invitations", getWorkspacePendingInvitations);
router.patch("/:workspace_id/members/:user_id", updateWorkspaceMember);
router.delete("/:workspace_id/members/:user_id", removeWorkspaceMember);
router.post("/:workspace_id/invitations", createWorkspaceInvitation);

export default router;
