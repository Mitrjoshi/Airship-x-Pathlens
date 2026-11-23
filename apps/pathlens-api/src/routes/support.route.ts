import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  createSupportAttachments,
  createSupportRequest,
} from "../controllers/support.controller";

const router = Router();
router.use(authMiddleware);
router.post("/attachments", createSupportAttachments);
router.post("/requests", createSupportRequest);
export default router;
