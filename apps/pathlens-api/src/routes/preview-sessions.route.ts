import { Router } from "express";
import {
  createPreviewSession,
  revokePreviewSession,
  supersedePreviewSession,
} from "../controllers/preview-sessions.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireAnyWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.post(
  "/",
  requireAnyWorkspacePermission("analytics.analytics.view"),
  createPreviewSession
);
router.delete(
  "/",
  requireAnyWorkspacePermission("analytics.analytics.view"),
  revokePreviewSession
);
router.post(
  "/supersede",
  requireAnyWorkspacePermission("analytics.analytics.view"),
  supersedePreviewSession
);

export default router;
