import { Router } from "express";
import {
  getHeatmapDetails,
  getHeatmaps,
} from "../controllers/heatmaps.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireAnyWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get(
  "/detail",
  requireAnyWorkspacePermission("analytics.analytics.view"),
  getHeatmapDetails
);
router.get(
  "/",
  requireAnyWorkspacePermission("analytics.analytics.view"),
  getHeatmaps
);

export default router;
