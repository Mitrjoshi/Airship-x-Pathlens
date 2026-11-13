import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  createProject,
  deleteProject,
  getProjects,
  pauseProject,
  resetProjectAnalytics,
  resumeProject,
  updateProject,
} from "../controllers/projects.controller";
import {
  createProjectApiKey,
  deleteProjectApiKey,
  listProjectApiKeys,
  revokeProjectApiKey,
  updateProjectApiKey,
} from "../controllers/project-api-keys.controller";
import { requireWorkspacePermission } from "../middleware/permission.middleware";
import { requireWorkspaceProjectPermission } from "../middleware/permission.middleware";
import {
  disconnectSlack,
  getSlackChannels,
  getSlackNotificationHistory,
  getSlackSettings,
  getStripeOverview,
  invitePathlensToSlackChannel,
  sendSlackTestMessage,
  updateSlackSettings,
} from "../controllers/project-integrations.controller";
import {
  checkGooglePageSpeed,
  installGooglePageSpeed,
} from "../controllers/google-pagespeed.controller";
import { checkGoogleSearchConsole } from "../controllers/google-search-console.controller";
import { getGoogleSearchConsoleDashboard } from "../controllers/google-search-console-dashboard.controller";
import { getPageSpeedDashboard } from "../controllers/page-speed-dashboard.controller";
import { getStripeDashboard } from "../controllers/stripe-dashboard.controller";
import { getDashboardIntegrations } from "../controllers/dashboard-integrations.controller";
import {
  createProjectDomain,
  deleteProjectDomain,
  getProjectDomains,
  updateProjectDomain,
} from "../controllers/project-domains.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", requireWorkspacePermission("projects.view"), getProjects);
router.get(
  "/:project_id/dashboard-integrations",
  requireWorkspaceProjectPermission("analytics.dashboard.view"),
  getDashboardIntegrations
);
router.get(
  "/:project_id/dashboard-integrations/google-search-console",
  requireWorkspaceProjectPermission("analytics.dashboard.view"),
  getGoogleSearchConsoleDashboard
);
router.get(
  "/:project_id/dashboard-integrations/pagespeed-insights",
  requireWorkspaceProjectPermission("analytics.dashboard.view"),
  getPageSpeedDashboard
);
router.get(
  "/:project_id/dashboard-integrations/stripe",
  requireWorkspaceProjectPermission("analytics.dashboard.view"),
  getStripeDashboard
);
router.post(
  "/:project_id/integrations/pagespeed-insights",
  requireWorkspaceProjectPermission("project.settings.update"),
  installGooglePageSpeed
);
router.post(
  "/:project_id/integrations/pagespeed-insights/check",
  requireWorkspaceProjectPermission("project.settings.view"),
  checkGooglePageSpeed
);
router.post(
  "/:project_id/integrations/google-search-console/check",
  requireWorkspaceProjectPermission("project.settings.view"),
  checkGoogleSearchConsole
);
router.get(
  "/:project_id/integrations/slack/channels",
  requireWorkspaceProjectPermission("project.settings.view"),
  getSlackChannels
);
router.get(
  "/:project_id/integrations/slack/notifications",
  requireWorkspaceProjectPermission("project.settings.view"),
  getSlackNotificationHistory
);
router.post(
  "/:project_id/integrations/slack/channels/:channel_id/invite",
  requireWorkspaceProjectPermission("project.settings.update"),
  invitePathlensToSlackChannel
);
router.get(
  "/:project_id/integrations/slack/settings",
  requireWorkspaceProjectPermission("project.settings.view"),
  getSlackSettings
);
router.put(
  "/:project_id/integrations/slack/settings",
  requireWorkspaceProjectPermission("project.settings.update"),
  updateSlackSettings
);
router.post(
  "/:project_id/integrations/slack/test",
  requireWorkspaceProjectPermission("project.settings.update"),
  sendSlackTestMessage
);
router.delete(
  "/:project_id/integrations/slack",
  requireWorkspaceProjectPermission("project.settings.update"),
  disconnectSlack
);
router.get(
  "/:project_id/integrations/stripe/overview",
  requireWorkspaceProjectPermission("project.settings.view"),
  getStripeOverview
);
router.post(
  "/create",
  requireWorkspacePermission("projects.create"),
  createProject
);
router.get(
  "/:project_id/api-keys",
  requireWorkspacePermission("project.api_keys.view"),
  listProjectApiKeys
);
router.post(
  "/:project_id/api-keys",
  requireWorkspacePermission("project.api_keys.create"),
  createProjectApiKey
);
router.get(
  "/:project_id/domains",
  requireWorkspacePermission("project.domains.view"),
  getProjectDomains
);
router.post(
  "/:project_id/domains",
  requireWorkspacePermission("project.domains.manage"),
  createProjectDomain
);
router.patch(
  "/:project_id/domains/:domain_id",
  requireWorkspacePermission("project.domains.manage"),
  updateProjectDomain
);
router.delete(
  "/:project_id/domains/:domain_id",
  requireWorkspacePermission("project.domains.manage"),
  deleteProjectDomain
);
router.patch(
  "/:project_id/api-keys/:key_id",
  requireWorkspacePermission("project.api_keys.update"),
  updateProjectApiKey
);
router.post(
  "/:project_id/api-keys/:key_id/revoke",
  requireWorkspacePermission("project.api_keys.revoke"),
  revokeProjectApiKey
);
router.delete(
  "/:project_id/api-keys/:key_id",
  requireWorkspacePermission("project.api_keys.revoke"),
  deleteProjectApiKey
);
router.patch(
  "/:project_id",
  requireWorkspacePermission("project.settings.update"),
  updateProject
);
router.post(
  "/:project_id/pause",
  requireWorkspacePermission("project.settings.update"),
  pauseProject
);
router.post(
  "/:project_id/resume",
  requireWorkspacePermission("project.settings.update"),
  resumeProject
);
router.post(
  "/:project_id/reset",
  requireWorkspacePermission("project.settings.update"),
  resetProjectAnalytics
);
router.delete(
  "/delete/:project_id",
  requireWorkspacePermission("projects.delete"),
  deleteProject
);

export default router;
