import { Router } from "express";
import { getUserJourney } from "../controllers/user-journey.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get(
  "/",
  requireWorkspacePermission("analytics.user_journey.view"),
  getUserJourney
);

export default router;
