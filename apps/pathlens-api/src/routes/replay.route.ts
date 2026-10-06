import { Router } from "express";
import { ingestReplayChunk } from "../controllers/replay.controller";
import { decryptEncryptedTrackingPayload } from "../middleware/encrypted-tracking-payload.middleware";

const router = Router();

router.post(
  "/chunks",
  (req, res, next) => decryptEncryptedTrackingPayload(req, res, next, "replay"),
  ingestReplayChunk
);

export default router;
