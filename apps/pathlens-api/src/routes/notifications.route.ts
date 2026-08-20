import { Router } from "express";

import {
  acceptNotification,
  getNotifications,
  markNotificationRead,
} from "../controllers/notifications.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", getNotifications);
router.post("/:notification_id/accept", acceptNotification);
router.patch("/:notification_id/read", markNotificationRead);

export default router;
