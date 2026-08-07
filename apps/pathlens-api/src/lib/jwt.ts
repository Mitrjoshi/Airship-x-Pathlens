import { Request } from "express";
import jwt from "jsonwebtoken";
import type { AuthUser } from "@workspace/backend-types";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) throw new Error("JWT_SECRET is required");

export const signJwt = (payload: AuthUser) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const verifyJwt = (token: string) => {
  return jwt.verify(token, JWT_SECRET) as AuthUser;
};

let cachedToken: string | null = null;
let tokenExpiry = 0;

export interface AuthRequest extends Request {
  user?: AuthUser;
}
