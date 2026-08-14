import { Router } from "express";
import { getErrors } from "../controllers/errors.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireAnyWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get(
  "/",
  requireAnyWorkspacePermission("analytics.analytics.view"),
  getErrors
);

export default router;
