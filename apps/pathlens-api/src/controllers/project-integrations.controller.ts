import crypto from "node:crypto";
import type { Request, Response } from "express";
import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";

import type { AuthRequest } from "../lib/jwt";
import { db } from "../db/client";
import {
  integrations,
  slackOauthStates,
  projectIntegrations,
} from "../db/schema";
import { createAuditLog } from "../models/audit-logs.model";
import {
  getProjectIntegrationBySlugModel,
  getProjectIntegrationsModel,
} from "../models/project-integrations.model";
import {
  decryptIntegrationCredentials,
  encryptIntegrationCredentials,
} from "../lib/credential-encryption";
import {
  getWorkspaceAccessModel,
  hasWorkspacePermission,
} from "../models/workshop.model";
import { getProjectWorkspaceIdModel } from "../models/projects.model";
import {
  getSlackChannel,
  listSlackChannels,
  postSlackMessage,
  SlackApiError,
} from "../lib/slack-api";

const SLACK_SCOPES = ["chat:write", "channels:read"] as const;
const STATE_TTL_MS = 10 * 60 * 1000;
const STATE_COOKIE = "pathlens_slack_oauth_state";
const slackSettingsInputSchema = z.object({
  channelId: z.string().min(1),
  dailyEnabled: z.boolean(),
  weeklyEnabled: z.boolean(),
  dailyHour: z.number().int().min(0).max(23),
  weeklyDay: z.number().int().min(1).max(7),
  weeklyHour: z.number().int().min(0).max(23),
  timezone: z.string().min(1),
});
const defaultSlackSettings = {
  channelId: null,
  dailyEnabled: false,
  weeklyEnabled: false,
  dailyHour: 9,
  weeklyDay: 1,
  weeklyHour: 9,
  timezone: "UTC",
} as const;

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function frontendUrl() {
  return requiredEnv("FRONTEND_URL").replace(/\/$/, "");
}

function getCookie(req: Request, name: string) {
  const header = req.headers.cookie ?? "";
  const entry = header
    .split(";")
    .find((part) => part.trim().startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.trim().slice(name.length + 1)) : null;
}

function setStateCookie(res: Response, value: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${STATE_COOKIE}=${encodeURIComponent(value)}; Max-Age=600; HttpOnly; SameSite=Lax; Path=/api/integrations/slack${secure}`
  );
}

function clearStateCookie(res: Response) {
  res.setHeader(
    "Set-Cookie",
    `${STATE_COOKIE}=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/api/integrations/slack`
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

function hash(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function redirectError(res: Response, returnPath: string, message: string) {
  const url = new URL(`${frontendUrl()}${safeReturnPath(returnPath)}`);
  url.searchParams.set("slack", "error");
  url.searchParams.set("message", message);
  return res.redirect(url.toString());
}

async function assertProjectAccess(
  workspaceId: string,
  projectId: string,
  userId: string
) {
  const access = await getWorkspaceAccessModel(workspaceId, userId);
  const projectWorkspaceId = await getProjectWorkspaceIdModel(projectId);
  if (
    !access ||
    projectWorkspaceId !== workspaceId ||
    !hasWorkspacePermission(access, "project.settings.update")
  ) {
    throw Object.assign(new Error("Workspace access denied"), {
      statusCode: 403,
    });
  }
}

function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function mergeSlackSettings(connection: {
  settings: unknown;
  notificationPreferences: unknown;
}) {
  const settings =
    connection.settings && typeof connection.settings === "object"
      ? connection.settings
      : {};
  const preferences =
    connection.notificationPreferences &&
    typeof connection.notificationPreferences === "object"
      ? connection.notificationPreferences
      : {};
  return {
    ...defaultSlackSettings,
    ...(settings as Record<string, unknown>),
    ...(preferences as Record<string, unknown>),
  };
}

function getAccessToken(connection: { encryptedCredentials: string }) {
  const credentials = decryptIntegrationCredentials<{ accessToken?: string }>(
    connection.encryptedCredentials
  );
  if (!credentials.accessToken) throw new SlackApiError("invalid_auth");
  return credentials.accessToken;
}

function sendSlackError(res: Response, error: unknown) {
  if (error instanceof SlackApiError) {
    if (error.code === "ratelimited") {
      if (error.retryAfterSeconds !== undefined) {
        res.setHeader("Retry-After", error.retryAfterSeconds);
      }
      return res.status(429).json({
        success: false,
        code: error.code,
        message: "Slack is rate limiting requests. Please try again shortly.",
      });
    }
    if (["invalid_auth", "token_revoked"].includes(error.code)) {
      return res.status(401).json({
        success: false,
        code: error.code,
        message: "The Slack connection is no longer valid. Reconnect Slack.",
      });
    }
    if (error.code === "missing_scope") {
      return res.status(502).json({
        success: false,
        code: error.code,
        message:
          "The Slack app is missing permissions required for this action.",
      });
    }
    if (error.code === "not_in_channel") {
      return res.status(400).json({
        success: false,
        code: error.code,
        message: "Invite @Pathlens to the selected Slack channel first.",
      });
    }
    if (error.code === "channel_not_found") {
      return res.status(400).json({
        success: false,
        code: error.code,
        message: "That Slack channel is no longer available.",
      });
    }
  }
  console.error("Slack integration request failed");
  return res.status(502).json({
    success: false,
    message: "Slack could not complete the request. Please try again.",
  });
}

export async function connectSlack(req: AuthRequest, res: Response) {
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
    await assertProjectAccess(workspaceId, projectId, req.user.id);

    const nonce = crypto.randomBytes(32).toString("base64url");
    await db.insert(slackOauthStates).values({
      workspaceId,
      projectId,
      userId: req.user.id,
      nonceHash: hash(nonce),
      returnPath: safeReturnPath(req.query.return_path),
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    });
    setStateCookie(res, nonce);

    const url = new URL("https://slack.com/oauth/v2/authorize");
    url.searchParams.set("client_id", requiredEnv("SLACK_CLIENT_ID"));
    url.searchParams.set("scope", SLACK_SCOPES.join(","));
    url.searchParams.set("redirect_uri", requiredEnv("SLACK_REDIRECT_URI"));
    url.searchParams.set("state", nonce);
    if (req.query.response === "json") {
      return res.json({ success: true, url: url.toString() });
    }
    return res.redirect(url.toString());
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 503;
    if (status === 403)
      return res.status(status).json({
        success: false,
        message: "You do not have permission to manage integrations.",
      });
    console.error("Slack OAuth initialization failed");
    return res.status(status).json({
      success: false,
      message: "Slack integration is not configured.",
    });
  }
}

async function exchangeSlackCode(code: string) {
  const response = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv("SLACK_CLIENT_ID"),
      client_secret: requiredEnv("SLACK_CLIENT_SECRET"),
      redirect_uri: requiredEnv("SLACK_REDIRECT_URI"),
    }),
  });
  if (!response.ok) throw new Error("Slack token exchange failed");
  return (await response.json()) as {
    ok?: boolean;
    access_token?: string;
    scope?: string;
    team?: { id?: string; name?: string };
    bot_user_id?: string;
    error?: string;
  };
}

export async function slackCallback(req: AuthRequest, res: Response) {
  const returnedState =
    typeof req.query.state === "string" ? req.query.state : "";
  const cookieState = getCookie(req, STATE_COOKIE);
  let returnPath = "/";

  try {
    if (
      !returnedState ||
      !cookieState ||
      returnedState.length !== cookieState.length ||
      !crypto.timingSafeEqual(
        Buffer.from(returnedState),
        Buffer.from(cookieState)
      )
    ) {
      return redirectError(
        res,
        returnPath,
        "Invalid Slack authorization state."
      );
    }

    const [state] = await db
      .update(slackOauthStates)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(slackOauthStates.nonceHash, hash(returnedState)),
          isNull(slackOauthStates.consumedAt),
          gt(slackOauthStates.expiresAt, new Date())
        )
      )
      .returning({
        id: slackOauthStates.id,
        workspaceId: slackOauthStates.workspaceId,
        projectId: slackOauthStates.projectId,
        userId: slackOauthStates.userId,
        returnPath: slackOauthStates.returnPath,
      });
    if (!state)
      return redirectError(
        res,
        returnPath,
        "Expired or invalid Slack authorization state."
      );
    returnPath = state.returnPath;
    await assertProjectAccess(state.workspaceId, state.projectId, state.userId);

    if (typeof req.query.error === "string")
      return redirectError(
        res,
        returnPath,
        "Slack authorization was cancelled."
      );
    const code = typeof req.query.code === "string" ? req.query.code : "";
    if (!code)
      return redirectError(
        res,
        returnPath,
        "Slack authorization was cancelled."
      );

    const token = await exchangeSlackCode(code);
    const grantedScopes = (token.scope ?? "")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean);
    if (
      !token.ok ||
      !token.access_token ||
      !token.team?.id ||
      !token.team.name ||
      !SLACK_SCOPES.every((scope) => grantedScopes.includes(scope))
    ) {
      return redirectError(
        res,
        returnPath,
        "Slack did not grant the required permissions."
      );
    }

    const [integration] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(eq(integrations.slug, "slack"))
      .limit(1);
    if (!integration)
      throw new Error("Slack integration catalog entry is missing");

    const encryptedCredentials = encryptIntegrationCredentials({
      accessToken: token.access_token,
    });
    const [previousConnection] = await db
      .select({ status: projectIntegrations.status })
      .from(projectIntegrations)
      .where(
        and(
          eq(projectIntegrations.projectId, state.projectId),
          eq(projectIntegrations.integrationId, integration.id)
        )
      )
      .limit(1);
    const existing = await db
      .insert(projectIntegrations)
      .values({
        projectId: state.projectId,
        integrationId: integration.id,
        providerWorkspaceId: token.team.id,
        providerWorkspaceName: token.team.name,
        encryptedCredentials,
        credentialKeyVersion: 1,
        providerBotUserId: token.bot_user_id ?? null,
        grantedScopes,
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
          providerWorkspaceId: token.team.id,
          providerWorkspaceName: token.team.name,
          encryptedCredentials,
          credentialKeyVersion: 1,
          providerBotUserId: token.bot_user_id ?? null,
          grantedScopes,
          status: "connected",
          connectedByUserId: state.userId,
          connectedAt: new Date(),
          updatedAt: new Date(),
          lastError: null,
        },
      })
      .returning({ id: projectIntegrations.id });
    await createAuditLog({
      workspaceId: state.workspaceId,
      actorUserId: state.userId,
      action: previousConnection
        ? "integration.slack.reconnected"
        : "integration.slack.connected",
      resourceType: "project_integration",
      resourceId: existing[0]?.id,
      metadata: { providerWorkspaceId: token.team.id },
    });
    clearStateCookie(res);
    const successUrl = new URL(`${frontendUrl()}${returnPath}`);
    successUrl.searchParams.set("slack", "connected");
    return res.redirect(successUrl.toString());
  } catch (error) {
    console.error("Slack OAuth callback failed");
    return redirectError(
      res,
      returnPath,
      "Unable to connect Slack. Please try again."
    );
  }
}

export async function getProjectIntegrations(req: AuthRequest, res: Response) {
  const projectId =
    typeof req.params.project_id === "string" ? req.params.project_id : "";
  const data = await getProjectIntegrationsModel(projectId);
  return res.json({ success: true, data });
}

export async function getSlackChannels(req: AuthRequest, res: Response) {
  const projectId =
    typeof req.params.project_id === "string" ? req.params.project_id : "";
  try {
    const integration = await getProjectIntegrationBySlugModel(
      projectId,
      "slack"
    );
    if (!integration || integration.connection.status !== "connected") {
      return res
        .status(404)
        .json({ success: false, message: "Slack is not connected." });
    }
    const channels = await listSlackChannels(
      getAccessToken(integration.connection)
    );
    return res.json({
      success: true,
      data: channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        isMember: channel.is_member,
        memberCount: channel.num_members ?? null,
        topic: channel.topic?.value ?? null,
        purpose: channel.purpose?.value ?? null,
      })),
    });
  } catch (error) {
    return sendSlackError(res, error);
  }
}

export async function getSlackSettings(req: AuthRequest, res: Response) {
  const projectId =
    typeof req.params.project_id === "string" ? req.params.project_id : "";
  const integration = await getProjectIntegrationBySlugModel(
    projectId,
    "slack"
  );
  if (!integration)
    return res
      .status(404)
      .json({ success: false, message: "Slack is not connected." });
  return res.json({
    success: true,
    data: {
      workspaceName: integration.connection.providerWorkspaceName,
      status: integration.connection.status,
      settings: mergeSlackSettings(integration.connection),
    },
  });
}

export async function updateSlackSettings(req: AuthRequest, res: Response) {
  const projectId =
    typeof req.params.project_id === "string" ? req.params.project_id : "";
  const parsed = slackSettingsInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid Slack notification settings.",
    });
  }
  if (!isValidTimezone(parsed.data.timezone)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid Slack timezone." });
  }
  const integration = await getProjectIntegrationBySlugModel(
    projectId,
    "slack"
  );
  if (!integration || integration.connection.status !== "connected") {
    return res
      .status(404)
      .json({ success: false, message: "Slack is not connected." });
  }
  try {
    const channel = await getSlackChannel(
      getAccessToken(integration.connection),
      parsed.data.channelId
    );
    if (
      !channel ||
      channel.is_archived ||
      channel.is_private ||
      !channel.is_member
    ) {
      return res.status(400).json({
        success: false,
        code: "not_in_channel",
        message:
          "Invite @Pathlens to a public Slack channel before selecting it.",
      });
    }
    await db
      .update(projectIntegrations)
      .set({
        settings: {
          channelId: parsed.data.channelId,
          dailyHour: parsed.data.dailyHour,
          weeklyDay: parsed.data.weeklyDay,
          weeklyHour: parsed.data.weeklyHour,
          timezone: parsed.data.timezone,
        },
        notificationPreferences: {
          dailyEnabled: parsed.data.dailyEnabled,
          weeklyEnabled: parsed.data.weeklyEnabled,
        },
        updatedAt: new Date(),
      })
      .where(eq(projectIntegrations.id, integration.connection.id));
    return res.json({ success: true, data: parsed.data });
  } catch (error) {
    return sendSlackError(res, error);
  }
}

export async function sendSlackTestMessage(req: AuthRequest, res: Response) {
  const projectId =
    typeof req.params.project_id === "string" ? req.params.project_id : "";
  const integration = await getProjectIntegrationBySlugModel(
    projectId,
    "slack"
  );
  if (!integration || integration.connection.status !== "connected") {
    return res
      .status(404)
      .json({ success: false, message: "Slack is not connected." });
  }
  const settings = mergeSlackSettings(integration.connection);
  if (!settings.channelId || typeof settings.channelId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Select a Slack channel before sending a test.",
    });
  }
  try {
    const accessToken = getAccessToken(integration.connection);
    const channel = await getSlackChannel(accessToken, settings.channelId);
    if (
      !channel ||
      channel.is_archived ||
      channel.is_private ||
      !channel.is_member
    ) {
      return res.status(400).json({
        success: false,
        code: "not_in_channel",
        message: "Invite @Pathlens to the selected Slack channel first.",
      });
    }
    const result = await postSlackMessage(
      accessToken,
      settings.channelId,
      `Pathlens is connected successfully!\n\nProject: ${integration.projectName}\nSlack notifications are configured correctly.\n\nYou'll receive analytics summaries here when scheduled reporting is enabled.`
    );
    return res.json({ success: true, data: { messageTs: result.ts ?? null } });
  } catch (error) {
    return sendSlackError(res, error);
  }
}

export async function disconnectSlack(req: AuthRequest, res: Response) {
  const workspaceId =
    typeof req.query.workspace_id === "string" ? req.query.workspace_id : "";
  const projectId =
    typeof req.params.project_id === "string" ? req.params.project_id : "";
  const userId = req.user!.id;
  await assertProjectAccess(workspaceId, projectId, userId);
  const [integration] = await db
    .select({ id: integrations.id })
    .from(integrations)
    .where(eq(integrations.slug, "slack"))
    .limit(1);
  if (!integration)
    return res
      .status(404)
      .json({ success: false, message: "Slack integration is unavailable." });
  const [connection] = await db
    .select()
    .from(projectIntegrations)
    .where(
      and(
        eq(projectIntegrations.projectId, projectId),
        eq(projectIntegrations.integrationId, integration.id)
      )
    )
    .limit(1);
  if (!connection)
    return res
      .status(404)
      .json({ success: false, message: "Slack is not connected." });

  try {
    const credentials = JSON.parse(connection.encryptedCredentials) as {
      ciphertext?: string;
    };
    if (credentials.ciphertext) {
      // Slack revocation is best-effort; local credentials are invalidated regardless.
      const { decryptIntegrationCredentials } =
        await import("../lib/credential-encryption");
      const { accessToken } = decryptIntegrationCredentials<{
        accessToken: string;
      }>(connection.encryptedCredentials);
      await fetch("https://slack.com/api/auth.revoke", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    }
  } catch {
    console.error("Slack credential revocation failed");
  }
  await db
    .update(projectIntegrations)
    .set({
      encryptedCredentials: encryptIntegrationCredentials({}),
      status: "disconnected",
      updatedAt: new Date(),
      lastError: null,
    })
    .where(eq(projectIntegrations.id, connection.id));
  await createAuditLog({
    workspaceId,
    actorUserId: userId,
    action: "integration.slack.disconnected",
    resourceType: "project_integration",
    resourceId: connection.id,
  });
  return res.json({ success: true });
}
