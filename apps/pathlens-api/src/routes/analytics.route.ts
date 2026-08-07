import { Router } from "express";
import { getAnalytics } from "../controllers/analytics.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", getAnalytics);

export default router;
