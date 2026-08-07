import { Router } from "express";
import {
  createUser,
  getUser,
  getUserWorkspaces,
  loginUser,
} from "../controllers/users.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/sign-up", createUser);
router.post("/login", loginUser);

router.use(authMiddleware);

router.get("/me", getUser);
router.get("/workspaces", getUserWorkspaces);

export default router;
