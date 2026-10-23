import { Router } from "express";
import {
  createPreviewSession,
  revokePreviewSession,
  supersedePreviewSession,
} from "../controllers/preview-sessions.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  requirePreviewSessionWorkspacePermission,
  requireWorkspaceProjectPermission,
} from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.post(
  "/",
  requireWorkspaceProjectPermission("analytics.analytics.view"),
  createPreviewSession
);
router.delete(
  "/",
  requirePreviewSessionWorkspacePermission("analytics.analytics.view"),
  revokePreviewSession
);
router.post(
  "/supersede",
  requirePreviewSessionWorkspacePermission("analytics.analytics.view"),
  supersedePreviewSession
);

export default router;
