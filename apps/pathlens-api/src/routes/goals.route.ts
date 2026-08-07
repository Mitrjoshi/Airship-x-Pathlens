import { Router } from "express";
import {
  createGoal,
  deleteGoal,
  getGoals,
  updateGoal,
} from "../controllers/goals.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", requireWorkspacePermission("analytics.goals.view"), getGoals);
router.post(
  "/",
  requireWorkspacePermission("analytics.goals.manage"),
  createGoal
);
router.patch(
  "/:goal_id",
  requireWorkspacePermission("analytics.goals.manage"),
  updateGoal
);
router.delete(
  "/:goal_id",
  requireWorkspacePermission("analytics.goals.manage"),
  deleteGoal
);

export default router;
