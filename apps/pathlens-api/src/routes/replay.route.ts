import { Router } from "express";
import { ingestReplayChunk } from "../controllers/replay.controller";
import { decryptEncryptedTrackingPayload } from "../middleware/encrypted-tracking-payload.middleware";

const router = Router();

router.post("/chunks", decryptEncryptedTrackingPayload, ingestReplayChunk);

export default router;
