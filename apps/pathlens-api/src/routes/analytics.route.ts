import { Router } from "express";
import { getAnalytics } from "../controllers/analytics.controller";
import {
  downloadReportController,
  generateReportController,
  getReportGenerationsController,
} from "../controllers/report-generations.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  requireAnyWorkspacePermission,
  requireWorkspacePermission,
} from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);

router.get(
  "/reports",
  requireWorkspacePermission("analytics.reports.view"),
  getReportGenerationsController
);
router.post(
  "/reports",
  requireWorkspacePermission("analytics.reports.export"),
  generateReportController
);
router.get(
  "/reports/:report_id/download",
  requireWorkspacePermission("analytics.reports.export"),
  downloadReportController
);

router.get(
  "/",
  requireAnyWorkspacePermission(
    "analytics.analytics.view",
    "analytics.reports.view"
  ),
  getAnalytics
);

export default router;
