import { Router } from "express";
import { getCampaigns } from "../controllers/campaigns.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get(
  "/",
  requireWorkspacePermission("analytics.goals.view"),
  getCampaigns
);

export default router;
