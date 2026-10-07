import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  createProject,
  deleteProject,
  getProjects,
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
import {
  createProjectDomain,
  deleteProjectDomain,
  getProjectDomains,
  updateProjectDomain,
} from "../controllers/project-domains.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", requireWorkspacePermission("projects.view"), getProjects);
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
  requireWorkspacePermission("project.settings.view"),
  getProjectDomains
);
router.post(
  "/:project_id/domains",
  requireWorkspacePermission("project.settings.update"),
  createProjectDomain
);
router.patch(
  "/:project_id/domains/:domain_id",
  requireWorkspacePermission("project.settings.update"),
  updateProjectDomain
);
router.delete(
  "/:project_id/domains/:domain_id",
  requireWorkspacePermission("project.settings.update"),
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
router.delete(
  "/delete/:project_id",
  requireWorkspacePermission("projects.delete"),
  deleteProject
);

export default router;
