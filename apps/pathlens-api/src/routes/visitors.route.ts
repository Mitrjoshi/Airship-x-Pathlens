import { Router } from "express";
import { getVisitors } from "../controllers/visitors.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get(
  "/",
  requireWorkspacePermission("analytics.visitors.view"),
  getVisitors
);

export default router;
