import crypto from "node:crypto";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { and, eq } from "drizzle-orm";
import { z, ZodError } from "zod";

import type { AuthRequest } from "../lib/jwt";
import { db } from "../db/client";
import {
  integrations,
  projectDomains,
  projectIntegrations,
} from "../db/schema";
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from "../lib/credential-encryption";
import { getGoogleOAuthEnv } from "../lib/google-integration";
import {
  runSearchConsoleReport,
  SearchConsoleApiError,
} from "../lib/google-search-console";
import { getProjectIntegrationBySlugModel } from "../models/project-integrations.model";

export const SEARCH_CONSOLE_SLUG = "google-search-console";
const STATE_COOKIE = "pathlens_google_search_console_state";
const checkSchema = z.object({
  domainId: z.uuid(),
  days: z.union([z.literal(7), z.literal(28), z.literal(90)]).default(28),
});

type SearchConsoleState = {
  purpose: "google-search-console-oauth";
  workspaceId: string;
  projectId: string;
  userId: string;
  returnPath: string;
  nonce: string;
};

function frontendUrl() {
  return getGoogleOAuthEnv("FRONTEND_URL").replace(/\/$/, "");
}

function callbackUrl(req: Request) {
  return (
    process.env.GOOGLE_SEARCH_CONSOLE_CALLBACK_URL ??
    `${req.protocol}://${req.get("host")}/api/integrations/google-search-console/callback`
  );
}

function safeReturnPath(value: unknown) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/";
  }
  return value;
}

function getCookie(req: Request, name: string) {
  const header = req.headers.cookie ?? "";
  const entry = header
    .split(";")
    .find((part) => part.trim().startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.trim().slice(name.length + 1)) : null;
}

function setStateCookie(res: Response, nonce: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${STATE_COOKIE}=${encodeURIComponent(nonce)}; Max-Age=600; HttpOnly; SameSite=Lax; Path=/api/integrations/google-search-console${secure}`
  );
}

function clearStateCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    `${STATE_COOKIE}=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/api/integrations/google-search-console`
  );
}

function stateUrl(state: string, req: Request) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", getGoogleOAuthEnv("GOOGLE_AUTH_CLIENT_ID"));
  url.searchParams.set("redirect_uri", callbackUrl(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    "openid email profile https://www.googleapis.com/auth/webmasters.readonly"
  );
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export function connectGoogleSearchConsole(req: AuthRequest, res: Response) {
  try {
    const workspaceId =
      typeof req.query.workspace_id === "string" ? req.query.workspace_id : "";
    const projectId =
      typeof req.query.project_id === "string" ? req.query.project_id : "";
    if (!workspaceId || !projectId || !req.user?.id) {
      return res.status(400).json({
        success: false,
        message: "Workspace and project ids are required.",
      });
    }

    const nonce = crypto.randomBytes(32).toString("base64url");
    const state = jwt.sign(
      {
        purpose: "google-search-console-oauth",
        workspaceId,
        projectId,
        userId: req.user.id,
        returnPath: safeReturnPath(req.query.return_path),
        nonce,
      } satisfies SearchConsoleState,
      getGoogleOAuthEnv("JWT_SECRET"),
      { expiresIn: "10m" }
    );
    setStateCookie(res, nonce);

    const url = stateUrl(state, req);
    if (req.query.response === "json") {
      return res.json({ success: true, url });
    }
    return res.redirect(url);
  } catch (error) {
    console.error("Google Search Console OAuth initialization failed", error);
    return res.status(503).json({
      success: false,
      message: "Google Search Console is not configured.",
    });
  }
}

async function exchangeCode(code: string, req: Request) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getGoogleOAuthEnv("GOOGLE_AUTH_CLIENT_ID"),
      client_secret: getGoogleOAuthEnv("GOOGLE_AUTH_CLIENT_SECRET"),
      redirect_uri: callbackUrl(req),
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) throw new Error("Google token exchange failed.");

  const data = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
  };
  if (!data.access_token)
    throw new Error("Google did not return an access token.");
  return data;
}

function redirectError(res: Response, returnPath: string, message: string) {
  const url = new URL(`${frontendUrl()}${safeReturnPath(returnPath)}`);
  url.searchParams.set("google_search_console", "error");
  url.searchParams.set("message", message);
  return res.redirect(url.toString());
}

export async function googleSearchConsoleCallback(req: Request, res: Response) {
  let returnPath = "/";
  try {
    const stateToken =
      typeof req.query.state === "string" ? req.query.state : "";
    const state = jwt.verify(
      stateToken,
      getGoogleOAuthEnv("JWT_SECRET")
    ) as SearchConsoleState;
    returnPath = state.returnPath;
    if (
      state.purpose !== "google-search-console-oauth" ||
      getCookie(req, STATE_COOKIE) !== state.nonce
    ) {
      throw new Error("Invalid Google Search Console OAuth state.");
    }

    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code)
      throw new Error("Google Search Console authorization was cancelled.");
    const tokens = await exchangeCode(code, req);
    const [integration] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(eq(integrations.slug, SEARCH_CONSOLE_SLUG))
      .limit(1);
    if (!integration) throw new Error("Search Console integration is missing.");

    const [previous] = await db
      .select({
        encryptedCredentials: projectIntegrations.encryptedCredentials,
      })
      .from(projectIntegrations)
      .where(
        and(
          eq(projectIntegrations.projectId, state.projectId),
          eq(projectIntegrations.integrationId, integration.id)
        )
      )
      .limit(1);
    const previousCredentials = previous
      ? decryptIntegrationCredentials<{ refreshToken?: string }>(
          previous.encryptedCredentials
        )
      : {};
    const refreshToken =
      tokens.refresh_token ?? previousCredentials.refreshToken;
    if (!refreshToken) {
      throw new Error(
        "Google did not return a refresh token. Please reconnect and approve access."
      );
    }

    await db
      .insert(projectIntegrations)
      .values({
        projectId: state.projectId,
        integrationId: integration.id,
        providerWorkspaceId: SEARCH_CONSOLE_SLUG,
        providerWorkspaceName: "Google Search Console",
        encryptedCredentials: encryptIntegrationCredentials({ refreshToken }),
        status: "connected",
        connectedByUserId: state.userId,
        connectedAt: new Date(),
        updatedAt: new Date(),
        lastError: null,
      })
      .onConflictDoUpdate({
        target: [
          projectIntegrations.projectId,
          projectIntegrations.integrationId,
        ],
        set: {
          encryptedCredentials: encryptIntegrationCredentials({ refreshToken }),
          status: "connected",
          connectedByUserId: state.userId,
          connectedAt: new Date(),
          updatedAt: new Date(),
          lastError: null,
        },
      });

    clearStateCookie(res);
    const successUrl = new URL(`${frontendUrl()}${safeReturnPath(returnPath)}`);
    successUrl.searchParams.set("google_search_console", "connected");
    return res.redirect(successUrl.toString());
  } catch (error) {
    console.error("Google Search Console OAuth callback failed", error);
    return redirectError(
      res,
      returnPath,
      "Unable to connect Google Search Console. Please try again."
    );
  }
}

function reportDateRange(days: number) {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export async function checkGoogleSearchConsole(
  req: AuthRequest,
  res: Response
) {
  try {
    const projectId = z.uuid().parse(req.params.project_id);
    const { domainId, days } = checkSchema.parse(req.body);
    const connection = await getProjectIntegrationBySlugModel(
      projectId,
      SEARCH_CONSOLE_SLUG
    );
    if (!connection || connection.connection.status !== "connected") {
      return res.status(404).json({
        success: false,
        message: "Google Search Console is not connected.",
      });
    }

    const [domain] = await db
      .select({ domain: projectDomains.domain })
      .from(projectDomains)
      .where(
        and(
          eq(projectDomains.id, domainId),
          eq(projectDomains.projectId, projectId)
        )
      )
      .limit(1);
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: "The selected domain does not belong to this project.",
      });
    }

    const credentials = decryptIntegrationCredentials<{
      refreshToken?: string;
    }>(connection.connection.encryptedCredentials);
    if (!credentials.refreshToken) {
      return res.status(401).json({
        success: false,
        message:
          "Google Search Console authorization is missing. Reconnect it.",
      });
    }

    const result = await runSearchConsoleReport(
      credentials.refreshToken,
      domain.domain,
      reportDateRange(days)
    );
    return res.json({ success: true, data: result });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: error.issues[0]?.message ?? "Invalid request.",
      });
    }
    if (error instanceof SearchConsoleApiError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }
    console.error("Google Search Console check failed", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load Google Search Console data.",
    });
  }
}
