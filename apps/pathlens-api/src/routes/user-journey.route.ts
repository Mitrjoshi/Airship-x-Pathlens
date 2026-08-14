import { Router } from "express";
import { getUserJourney } from "../controllers/user-journey.controller";
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
  getUserJourney
);

export default router;
