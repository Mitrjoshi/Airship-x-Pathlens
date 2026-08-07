import { Router } from "express";
import { getPerformance } from "../controllers/performance.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", getPerformance);

export default router;
