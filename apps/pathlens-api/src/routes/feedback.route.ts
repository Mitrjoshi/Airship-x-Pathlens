import { Router } from "express";

import { createFeedback } from "../controllers/feedback.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.post("/", createFeedback);

export default router;
