import { Router } from "express";

import {
  getIntegrationCategoriesController,
  getIntegrationByIdController,
  getIntegrationsController,
} from "../controllers/integrations.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireWorkspaceOrProjectPermission } from "../middleware/permission.middleware";
import { requireWorkspaceProjectPermission } from "../middleware/permission.middleware";
import {
  connectSlack,
  getStripeOverview,
  StripeAuthConnect,
} from "../controllers/project-integrations.controller";
import { connectGoogleSearchConsole } from "../controllers/google-search-console.controller";

const router = Router();

router.use(authMiddleware);
router.get("/categories", getIntegrationCategoriesController);
router.get(
  "/",
  (req, res, next) => {
    if (req.query.filter !== "installed") {
      next();
      return;
    }

    return requireWorkspaceOrProjectPermission(
      "projects.view",
      "project.settings.view"
    )(req, res, next);
  },
  getIntegrationsController
);
router.get("/slack/connect", connectSlack);
router.get("/stripe/connect", StripeAuthConnect);
router.get(
  "/google-search-console/connect",
  requireWorkspaceProjectPermission("project.settings.update"),
  connectGoogleSearchConsole
);
router.get("/:integrationId", getIntegrationByIdController);

export default router;
