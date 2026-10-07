import type { Request, Response } from "express";
import { isProjectOriginAllowed } from "../lib/project-domain";
import { resolveProjectApiKey } from "../lib/project-api-keys";

export async function getTrackingConfig(req: Request, res: Response) {
  const apiKey = req.header("x-project-key");

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: "X-Project-Key is required.",
    });
  }

  const projectApiKey = await resolveProjectApiKey(apiKey);

  if (
    !projectApiKey ||
    !isProjectOriginAllowed(
      projectApiKey.domains,
      req.header("origin"),
      req.header("referer")
    )
  ) {
    return res.status(403).json({
      success: false,
      message: "This API key is not authorized for this domain.",
    });
  }

  return res.json({
    success: true,
    data: {
      scopes: projectApiKey.scopes,
    },
  });
}
