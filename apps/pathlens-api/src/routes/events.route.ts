import { Router } from "express";
import { getEvents, ingestEvents } from "../controllers/events.controller";
import { ApiKeyMiddleware } from "../middleware/apiKey.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspacePermission } from "../middleware/permission.middleware";
import { decryptEncryptedTrackingPayload } from "../middleware/encrypted-tracking-payload.middleware";

const router = Router();

router.post("/", decryptEncryptedTrackingPayload, ingestEvents);
router.get(
  "/",
  ApiKeyMiddleware,
  authMiddleware,
  requireWorkspacePermission("analytics.events.view"),
  getEvents
);

export default router;
