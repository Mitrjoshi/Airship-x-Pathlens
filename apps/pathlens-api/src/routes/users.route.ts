import { Router } from "express";
import {
  createUser,
  changePassword,
  deleteUser,
  getUser,
  getUserWorkspaces,
  loginUser,
  updateUser,
} from "../controllers/users.controller";
import {
  confirmPasswordReset,
  requestPasswordReset,
} from "../controllers/password-reset.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.post("/sign-up", createUser);
router.post("/login", loginUser);
router.post("/password-reset/request", requestPasswordReset);
router.post("/password-reset/confirm", confirmPasswordReset);

router.use(authMiddleware);

router.get("/me", getUser);
router.patch("/me", updateUser);
router.patch("/me/password", changePassword);
router.delete("/me", deleteUser);
router.get("/workspaces", getUserWorkspaces);

export default router;
