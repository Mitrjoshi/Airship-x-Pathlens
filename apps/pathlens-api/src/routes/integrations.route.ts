import { Router } from "express";

import {
  getIntegrationByIdController,
  getIntegrationsController,
} from "../controllers/integrations.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { connectSlack } from "../controllers/project-integrations.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", getIntegrationsController);
router.get("/:integrationId", getIntegrationByIdController);
router.get("/slack/connect", connectSlack);

export default router;
