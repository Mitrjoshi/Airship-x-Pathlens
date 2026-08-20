import { Router } from "express";
import {
  getVisitors,
  getVisitorLocations,
} from "../controllers/visitors.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get(
  "/locations",
  requireWorkspacePermission("analytics.visitors.view"),
  getVisitorLocations
);
router.get(
  "/",
  requireWorkspacePermission("analytics.visitors.view"),
  getVisitors
);

export default router;
