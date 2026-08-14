import { Router } from "express";
import {
  createDashboard,
  createDashboardWidget,
  deleteDashboard,
  deleteDashboardWidget,
  getDashboard,
  getDashboards,
  updateDashboard,
  updateDashboardWidget,
} from "../controllers/dashboards.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);

router.get(
  "/",
  requireWorkspacePermission("analytics.dashboard.view"),
  getDashboards
);
router.post(
  "/",
  requireWorkspacePermission("analytics.dashboard.manage"),
  createDashboard
);
router.get(
  "/:dashboard_id",
  requireWorkspacePermission("analytics.dashboard.view"),
  getDashboard
);
router.patch(
  "/:dashboard_id",
  requireWorkspacePermission("analytics.dashboard.manage"),
  updateDashboard
);
router.delete(
  "/:dashboard_id",
  requireWorkspacePermission("analytics.dashboard.manage"),
  deleteDashboard
);

router.post(
  "/:dashboard_id/widgets",
  requireWorkspacePermission("analytics.dashboard.manage"),
  createDashboardWidget
);
router.patch(
  "/:dashboard_id/widgets/:widget_id",
  requireWorkspacePermission("analytics.dashboard.manage"),
  updateDashboardWidget
);
router.delete(
  "/:dashboard_id/widgets/:widget_id",
  requireWorkspacePermission("analytics.dashboard.manage"),
  deleteDashboardWidget
);

export default router;
