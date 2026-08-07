import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import {
  createProject,
  deleteProject,
  getProjects,
} from "../controllers/projects.controller";

const router = Router();

router.use(authMiddleware);
router.get("/", getProjects);
router.post("/create", createProject);
router.delete("/delete/:project_id", deleteProject);

export default router;
