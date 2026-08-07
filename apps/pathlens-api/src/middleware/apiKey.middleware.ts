import { Request, Response, NextFunction } from "express";

export function ApiKeyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const expectedSecret = process.env.INTERNAL_API_SECRET;
  const receivedSecret = req.headers["x-api-key"];

  if (!expectedSecret) {
    return res.status(500).json({
      success: false,
      message: "INTERNAL_API_SECRET is missing",
    });
  }

  if (receivedSecret !== expectedSecret) {
    return res.status(401).json({
      success: false,
      message: "Invalid API Key",
    });
  }

  next();
}
