import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from "../controllers/projects.controller";
import { requireWorkspacePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", requireWorkspacePermission("projects.view"), getProjects);
router.post(
  "/create",
  requireWorkspacePermission("projects.create"),
  createProject
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
