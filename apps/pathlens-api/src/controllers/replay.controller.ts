import { replayChunkSchema } from "@workspace/contracts";
import { Request, Response } from "express";
import { ZodError } from "zod";
import {
  ingestReplayChunkModel,
  InvalidReplayProjectKeyError,
} from "../models/replay.model";

export async function ingestReplayChunk(req: Request, res: Response) {
  try {
    const chunk = replayChunkSchema.parse(req.body);

    await ingestReplayChunkModel(chunk);

    return res.sendStatus(202);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Invalid replay chunk.",
      });
    }

    if (error instanceof InvalidReplayProjectKeyError) {
      return res.status(401).json({
        success: false,
        message: error.message,
      });
    }

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to store replay chunk.",
    });
  }
}
