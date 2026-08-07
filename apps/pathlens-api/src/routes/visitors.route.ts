import { Router } from "express";
import { getVisitors } from "../controllers/visitors.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", getVisitors);

export default router;
