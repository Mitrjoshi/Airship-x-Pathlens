import type { Request, Response, NextFunction } from "express";
import type { AuthUser } from "@workspace/backend-types";
import { verifyJwt } from "../lib/jwt";

export interface AuthenticatedRequest<
  Params = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: AuthUser;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")) {
      res.status(401).json({
        success: false,
        message: "Unauthorized, token not found or is in the wrong format.",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized, token not found.",
      });
    }

    const payload = verifyJwt(token);

    req.user = payload;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}
