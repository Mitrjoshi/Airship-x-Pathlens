import { Router } from "express";
import {
  createGoal,
  deleteGoal,
  getGoals,
  updateGoal,
} from "../controllers/goals.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", getGoals);
router.post("/", createGoal);
router.patch("/:goal_id", updateGoal);
router.delete("/:goal_id", deleteGoal);

export default router;
