import { Router } from "express";
import { getEvents, ingestEvents } from "../controllers/events.controller";
import { ApiKeyMiddleware } from "../middleware/apiKey.middleware";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/", ingestEvents);
router.get("/", ApiKeyMiddleware, authMiddleware, getEvents);

export default router;
