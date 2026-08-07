import { Router } from "express";
import { getPerformance } from "../controllers/performance.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get(
  "/",
  requireWorkspacePermission("analytics.performance.view"),
  getPerformance
);

export default router;
