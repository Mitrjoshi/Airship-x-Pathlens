import { Router } from "express";

import {
  acceptNotification,
  getNotifications,
} from "../controllers/notifications.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getNotifications);
router.post("/:notification_id/accept", acceptNotification);

export default router;
