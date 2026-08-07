import { Router } from "express";
import { getAnalytics } from "../controllers/analytics.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireAnyWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get(
  "/",
  requireAnyWorkspacePermission(
    "analytics.analytics.view",
    "analytics.reports.view"
  ),
  getAnalytics
);

export default router;
