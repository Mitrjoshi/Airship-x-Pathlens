import { Router } from "express";

import {
  createFeedback,
  getFeedbackStatus,
} from "../controllers/feedback.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/status", getFeedbackStatus);
router.post("/", createFeedback);

export default router;
