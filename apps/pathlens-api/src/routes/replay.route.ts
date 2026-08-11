import { Router } from "express";
import { ingestReplayChunk } from "../controllers/replay.controller";

const router = Router();

router.post("/chunks", ingestReplayChunk);

export default router;
