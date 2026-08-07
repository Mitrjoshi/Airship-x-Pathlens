import { Router } from "express";
import {
  getSessionReplay,
  getSessionReplayDetail,
} from "../controllers/session-replay.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", getSessionReplay);
router.get("/:sessionId", getSessionReplayDetail);

export default router;
