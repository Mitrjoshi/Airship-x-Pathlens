import { Router } from "express";
import {
  createFunnel,
  deleteFunnel,
  getFunnels,
  updateFunnel,
} from "../controllers/funnels.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = Router();

router.use(authMiddleware);
router.get("/", getFunnels);
router.post("/", createFunnel);
router.patch("/:funnel_id", updateFunnel);
router.delete("/:funnel_id", deleteFunnel);

export default router;
