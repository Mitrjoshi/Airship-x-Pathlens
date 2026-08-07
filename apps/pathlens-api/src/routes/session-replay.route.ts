import { Router } from "express";
import {
  getSessionReplay,
  getSessionReplayDetail,
} from "../controllers/session-replay.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get(
  "/",
  requireWorkspacePermission("analytics.session_replay.view"),
  getSessionReplay
);
router.get(
  "/:sessionId",
  requireWorkspacePermission("analytics.session_replay.view"),
  getSessionReplayDetail
);

export default router;
