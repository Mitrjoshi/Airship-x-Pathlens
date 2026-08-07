import { Router } from "express";
import {
  createFunnel,
  deleteFunnel,
  getFunnels,
  updateFunnel,
} from "../controllers/funnels.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get(
  "/",
  requireWorkspacePermission("analytics.funnels.view"),
  getFunnels
);
router.post(
  "/",
  requireWorkspacePermission("analytics.funnels.manage"),
  createFunnel
);
router.patch(
  "/:funnel_id",
  requireWorkspacePermission("analytics.funnels.manage"),
  updateFunnel
);
router.delete(
  "/:funnel_id",
  requireWorkspacePermission("analytics.funnels.manage"),
  deleteFunnel
);

export default router;
