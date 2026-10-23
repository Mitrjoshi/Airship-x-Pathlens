import { Router } from "express";
import {
  getHeatmapDetails,
  getHeatmaps,
} from "../controllers/heatmaps.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceProjectPermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get(
  "/detail",
  requireWorkspaceProjectPermission("analytics.analytics.view"),
  getHeatmapDetails
);
router.get(
  "/",
  requireWorkspaceProjectPermission("analytics.analytics.view"),
  getHeatmaps
);

export default router;
