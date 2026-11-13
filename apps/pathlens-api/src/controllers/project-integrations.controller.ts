import crypto from "node:crypto";
import type { Request, Response } from "express";
import { and, desc, eq, gt, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";

import type { AuthRequest } from "../lib/jwt";
import {
  slackProjectSettingsDefaults,
  slackProjectSettingsSchema,
} from "@workspace/contracts";
import { db } from "../db/client";
import {
  integrations,
  slackOauthStates,
  projectIntegrations,
  stripeOauthStates,
  integrationNotificationDeliveries,
} from "../db/schema";
import { createAuditLog } from "../models/audit-logs.model";
import { getProjectIntegrationBySlugModel } from "../models/project-integrations.model";
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
  inviteSlackUser,
  postSlackMessage,
  SlackApiError,
} from "../lib/slack-api";
import { stripe } from "../lib/stripe";
import { getStripeDashboardData } from "../services/stripe-dashboard.service";

const SLACK_SCOPES = ["chat:write", "channels:read", "groups:read"] as const;
const SLACK_USER_SCOPES = [
  "channels:write.invites",
  "groups:write.invites",
] as const;

const STATE_TTL_MS = 10 * 60 * 1000;
const SLACK_STATE_COOKIE = "pathlens_slack_oauth_state";
const STRIPE_STATE_COOKIE = "pathlens_stripe_oauth_state";
const slackTestMessageInputSchema = z.object({
  channelId: z.string().min(1),
});

const notificationHistoryQuerySchema = z.object({
  workspace_id: z.uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().min(1).optional(),
});

const notificationHistoryCursorSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.uuid(),
});

type NotificationHistoryStatus =
  | "pending"
  | "processing"
  | "delivered"
  | "retrying"
  | "failed"
  | "delivery_unconfirmed";

function decodeNotificationHistoryCursor(cursor: string) {
  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = notificationHistoryCursorSchema.safeParse(
      JSON.parse(decoded)
    );
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function encodeNotificationHistoryCursor(createdAt: Date, id: string) {
  return Buffer.from(
    JSON.stringify({ createdAt: createdAt.toISOString(), id })
  ).toString("base64url");
}

function getNotificationHistoryStatus(
  status: string,
  lastErrorCode: string | null
): NotificationHistoryStatus {
  if (lastErrorCode === "provider_outcome_unknown") {
    return "delivery_unconfirmed";
  }
  if (status === "scheduled" || status === "queued") return "pending";
  if (status === "processing") return "processing";
  if (status === "succeeded") return "delivered";
  if (status === "retryable_failed") return "retrying";
  return "failed";
}

function getSafeFailureCategory(status: string, lastErrorCode: string | null) {
  if (!lastErrorCode || status === "succeeded") return null;
  if (lastErrorCode === "provider_outcome_unknown")
    return "provider_outcome_unknown";
  if (status === "retryable_failed") return "retryable";
  if (status === "cancelled") return "cancelled";
  return "permanent";
}

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

type OAuthProvider = "slack" | "stripe";

const STATE_COOKIE: Record<OAuthProvider, string> = {
  slack: "pathlens_slack_oauth_state",
  stripe: "pathlens_stripe_oauth_state",
};

function setStateCookie(res: Response, value: string, provider: OAuthProvider) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookieName = STATE_COOKIE[provider];

  res.setHeader(
    "Set-Cookie",
    `${cookieName}=${encodeURIComponent(value)}; Max-Age=600; HttpOnly; SameSite=Lax; Path=/api/integrations/${provider}${secure}`
  );
}

function clearStateCookie(res: Response, provider: OAuthProvider) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const cookieName = STATE_COOKIE[provider];

  res.setHeader(
    "Set-Cookie",
    `${cookieName}=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/api/integrations/${provider}${secure}`
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
    ...slackProjectSettingsDefaults,
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

function getUserAccessToken(connection: { encryptedCredentials: string }) {
  const credentials = decryptIntegrationCredentials<{
    userAccessToken?: string;
  }>(connection.encryptedCredentials);
  if (!credentials.userAccessToken) throw new SlackApiError("invalid_auth");
  return credentials.userAccessToken;
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
    if (error.code === "already_in_channel") {
      return res.status(409).json({
        success: false,
        code: error.code,
        message: "Pathlens is already in that Slack channel.",
      });
    }
    if (error.code === "no_permission") {
      return res.status(403).json({
        success: false,
        code: error.code,
        message:
          "You do not have permission to invite Pathlens to that channel.",
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
    setStateCookie(res, nonce, "slack");

    const url = new URL("https://slack.com/oauth/v2/authorize");
    url.searchParams.set("client_id", requiredEnv("SLACK_CLIENT_ID"));
    url.searchParams.set("scope", SLACK_SCOPES.join(","));
    url.searchParams.set("user_scope", SLACK_USER_SCOPES.join(","));
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

export const StripeAuthConnect = async (req: AuthRequest, res: Response) => {
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

    await db.insert(stripeOauthStates).values({
      workspaceId,
      projectId,
      userId: req.user.id,
      nonceHash: hash(nonce),
      returnPath: safeReturnPath(req.query.return_path),
      expiresAt: new Date(Date.now() + STATE_TTL_MS),
    });

    setStateCookie(res, nonce, "stripe");

    const url = new URL("https://connect.stripe.com/oauth/authorize");

    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", requiredEnv("STRIPE_OAUTH_CLIENT_ID"));
    url.searchParams.set("scope", "read_write");
    url.searchParams.set("redirect_uri", requiredEnv("STRIPE_REDIRECT_URI"));
    url.searchParams.set("state", nonce);

    if (req.query.response === "json") {
      return res.json({
        success: true,
        url: url.toString(),
      });
    }

    return res.redirect(url.toString());
  } catch (error) {
    const status = (error as { statusCode?: number }).statusCode ?? 503;

    if (status === 403)
      return res.status(status).json({
        success: false,
        message: "You do not have permission to manage integrations.",
      });

    console.error("Stripe OAuth initialization failed", error);

    return res.status(status).json({
      success: false,
      message: "Stripe integration is not configured.",
    });
  }
};

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
    authed_user?: { access_token?: string; scope?: string };
    team?: { id?: string; name?: string };
    bot_user_id?: string;
    error?: string;
  };
}

export async function slackCallback(req: AuthRequest, res: Response) {
  const returnedState =
    typeof req.query.state === "string" ? req.query.state : "";
  const cookieState = getCookie(req, SLACK_STATE_COOKIE);
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
    const grantedUserScopes = (token.authed_user?.scope ?? "")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean);
    if (
      !token.ok ||
      !token.access_token ||
      !token.team?.id ||
      !token.team.name ||
      !token.authed_user?.access_token ||
      !SLACK_SCOPES.every((scope) => grantedScopes.includes(scope)) ||
      !SLACK_USER_SCOPES.every((scope) => grantedUserScopes.includes(scope))
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
      userAccessToken: token.authed_user.access_token,
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
    clearStateCookie(res, "stripe");
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

export async function stripeCallback(req: AuthRequest, res: Response) {
  const returnedState =
    typeof req.query.state === "string" ? req.query.state : "";
  const cookieState = getCookie(req, STRIPE_STATE_COOKIE);
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
        "Invalid Stripe authorization state."
      );
    }

    const [state] = await db
      .update(stripeOauthStates)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(stripeOauthStates.nonceHash, hash(returnedState)),
          isNull(stripeOauthStates.consumedAt),
          gt(stripeOauthStates.expiresAt, new Date())
        )
      )
      .returning({
        id: stripeOauthStates.id,
        workspaceId: stripeOauthStates.workspaceId,
        projectId: stripeOauthStates.projectId,
        userId: stripeOauthStates.userId,
        returnPath: stripeOauthStates.returnPath,
      });

    if (!state)
      return redirectError(
        res,
        returnPath,
        "Expired or invalid Stripe authorization state."
      );

    returnPath = state.returnPath ?? "/";

    await assertProjectAccess(state.workspaceId, state.projectId, state.userId);

    if (typeof req.query.error === "string")
      return redirectError(
        res,
        returnPath,
        "Stripe authorization was cancelled."
      );

    const code = typeof req.query.code === "string" ? req.query.code : "";

    if (!code)
      return redirectError(
        res,
        returnPath,
        "Stripe authorization was cancelled."
      );

    const token = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });

    const grantedScopes = token.scope ? [token.scope] : [];

    if (!token.stripe_user_id || !grantedScopes.includes("read_write")) {
      return redirectError(
        res,
        returnPath,
        "Stripe did not grant the required permissions."
      );
    }

    const stripeAccountId = token.stripe_user_id;

    let stripeAccountName = stripeAccountId;

    try {
      const account = await stripe.accounts.retrieve(stripeAccountId);

      stripeAccountName =
        account.business_profile?.name ||
        account.settings?.dashboard?.display_name ||
        account.email ||
        stripeAccountId;
    } catch (error) {
      console.warn("Unable to retrieve Stripe account details", error);
    }

    const [integration] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(eq(integrations.slug, "stripe"))
      .limit(1);

    if (!integration)
      throw new Error("Stripe integration catalog entry is missing");

    const encryptedCredentials = encryptIntegrationCredentials({
      stripeAccountId,
      livemode: token.livemode,
      scope: token.scope,
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

    console.log("Stripe integration insert:", {
      projectId: state.projectId,
      integrationId: integration.id,
      stripeAccountId,
      stripeAccountName,
      grantedScopes,
    });

    const existing = await db
      .insert(projectIntegrations)
      .values({
        projectId: state.projectId,
        integrationId: integration.id,
        providerWorkspaceId: stripeAccountId,
        providerWorkspaceName: stripeAccountName,
        encryptedCredentials,
        credentialKeyVersion: 1,
        providerBotUserId: null,
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
          providerWorkspaceId: stripeAccountId,
          providerWorkspaceName: stripeAccountName,
          encryptedCredentials,
          credentialKeyVersion: 1,
          providerBotUserId: null,
          grantedScopes,
          status: "connected",
          connectedByUserId: state.userId,
          connectedAt: new Date(),
          updatedAt: new Date(),
          lastError: null,
        },
      })
      .returning({
        id: projectIntegrations.id,
        projectId: projectIntegrations.projectId,
        integrationId: projectIntegrations.integrationId,
        status: projectIntegrations.status,
      });

    console.log("Stripe integration saved:", existing);

    await createAuditLog({
      workspaceId: state.workspaceId,
      actorUserId: state.userId,
      action: previousConnection
        ? "integration.stripe.reconnected"
        : "integration.stripe.connected",
      resourceType: "project_integration",
      resourceId: existing[0]?.id,
      metadata: {
        providerWorkspaceId: stripeAccountId,
        livemode: token.livemode,
      },
    });

    clearStateCookie(res, "stripe");

    const successUrl = new URL(`${frontendUrl()}${returnPath}`);
    successUrl.searchParams.set("stripe", "connected");

    return res.redirect(successUrl.toString());
  } catch (error) {
    console.error("Stripe OAuth callback failed", error);

    return redirectError(
      res,
      returnPath,
      "Unable to connect Stripe. Please try again."
    );
  }
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

export async function getSlackNotificationHistory(
  req: AuthRequest,
  res: Response
) {
  const parsed = notificationHistoryQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message:
        parsed.error.issues[0]?.message ??
        "Invalid notification history query.",
    });
  }

  const projectId =
    typeof req.params.project_id === "string" ? req.params.project_id : "";
  const cursor = parsed.data.cursor
    ? decodeNotificationHistoryCursor(parsed.data.cursor)
    : null;
  if (parsed.data.cursor && !cursor) {
    return res.status(400).json({
      success: false,
      message: "Invalid notification history cursor.",
    });
  }

  try {
    const conditions = [
      eq(
        integrationNotificationDeliveries.workspaceId,
        parsed.data.workspace_id
      ),
      eq(integrationNotificationDeliveries.projectId, projectId),
      eq(integrationNotificationDeliveries.provider, "slack"),
      eq(integrations.slug, "slack"),
    ];

    if (cursor) {
      const cursorDate = new Date(cursor.createdAt);
      conditions.push(
        or(
          lt(integrationNotificationDeliveries.createdAt, cursorDate),
          and(
            eq(integrationNotificationDeliveries.createdAt, cursorDate),
            lt(integrationNotificationDeliveries.id, cursor.id)
          )
        )!
      );
    }

    const rows = await db
      .select({
        id: integrationNotificationDeliveries.id,
        reportType: integrationNotificationDeliveries.reportType,
        scheduledFor: integrationNotificationDeliveries.scheduledFor,
        createdAt: integrationNotificationDeliveries.createdAt,
        lastAttemptAt: integrationNotificationDeliveries.lastAttemptAt,
        status: integrationNotificationDeliveries.status,
        lastErrorCode: integrationNotificationDeliveries.lastErrorCode,
      })
      .from(integrationNotificationDeliveries)
      .innerJoin(
        projectIntegrations,
        eq(
          projectIntegrations.id,
          integrationNotificationDeliveries.projectIntegrationId
        )
      )
      .innerJoin(
        integrations,
        eq(integrations.id, projectIntegrations.integrationId)
      )
      .where(and(...conditions))
      .orderBy(
        desc(integrationNotificationDeliveries.createdAt),
        desc(integrationNotificationDeliveries.id)
      )
      .limit(parsed.data.limit + 1);

    const hasMore = rows.length > parsed.data.limit;
    const page = hasMore ? rows.slice(0, parsed.data.limit) : rows;
    const last = page[page.length - 1];

    return res.json({
      success: true,
      data: {
        items: page.map((row) => ({
          id: row.id,
          reportType: row.reportType,
          status: getNotificationHistoryStatus(row.status, row.lastErrorCode),
          scheduledAt: row.scheduledFor.toISOString(),
          createdAt: row.createdAt.toISOString(),
          deliveredAt:
            row.status === "succeeded" && row.lastAttemptAt
              ? row.lastAttemptAt.toISOString()
              : null,
          failureCategory: getSafeFailureCategory(
            row.status,
            row.lastErrorCode
          ),
        })),
        nextCursor:
          hasMore && last
            ? encodeNotificationHistoryCursor(last.createdAt, last.id)
            : null,
      },
    });
  } catch (error) {
    console.error("Failed to load Slack notification history", error);
    return res.status(500).json({
      success: false,
      message: "Unable to load notification history.",
    });
  }
}

export async function invitePathlensToSlackChannel(
  req: AuthRequest,
  res: Response
) {
  const projectId =
    typeof req.params.project_id === "string" ? req.params.project_id : "";
  const channelId =
    typeof req.params.channel_id === "string" ? req.params.channel_id : "";
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
    if (!channelId || !integration.connection.providerBotUserId) {
      return res.status(400).json({
        success: false,
        message: "The Slack channel or Pathlens bot is unavailable.",
      });
    }
    await inviteSlackUser(
      getUserAccessToken(integration.connection),
      channelId,
      integration.connection.providerBotUserId
    );
    return res.json({ success: true });
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
  const parsed = slackProjectSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return res.status(400).json({
      success: false,
      message: issue
        ? `Invalid Slack notification settings: ${issue.message}`
        : "Invalid Slack notification settings.",
    });
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
    if (!channel || channel.is_archived || !channel.is_member) {
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
          dailyMinute: parsed.data.dailyMinute,
          weeklyDay: parsed.data.weeklyDay,
          weeklyHour: parsed.data.weeklyHour,
          weeklyMinute: parsed.data.weeklyMinute,
          timezone: parsed.data.timezone,
          weeklyDayConfirmed: true,
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
  const parsed = slackTestMessageInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Select a Slack channel before sending a test.",
    });
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
    const accessToken = getAccessToken(integration.connection);
    const channel = await getSlackChannel(accessToken, parsed.data.channelId);
    if (!channel || channel.is_archived || !channel.is_member) {
      return res.status(400).json({
        success: false,
        code: "not_in_channel",
        message: "Invite @Pathlens to the selected Slack channel first.",
      });
    }
    const result = await postSlackMessage(
      accessToken,
      parsed.data.channelId,
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
      const { accessToken, userAccessToken } = decryptIntegrationCredentials<{
        accessToken: string;
        userAccessToken?: string;
      }>(connection.encryptedCredentials);
      const tokens = [accessToken, userAccessToken].filter(
        (token): token is string => Boolean(token)
      );
      await Promise.all(
        tokens.map((token) =>
          fetch("https://slack.com/api/auth.revoke", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );
    }
  } catch {
    console.error("Slack credential revocation failed");
  }
  await db
    .update(projectIntegrations)
    .set({
      encryptedCredentials: encryptIntegrationCredentials({}),
      providerBotUserId: null,
      grantedScopes: [],
      settings: {},
      notificationPreferences: {},
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

const stripeAnalyticsSchema = z.object({
  workspace_id: z.uuid(),
  days: z.coerce.number().int().min(1).max(365).default(30),
});

const MAX_RECORDS = 5000;

// Stripe returns monetary amounts in minor currency units.
// Keep them as integers to avoid floating-point inaccuracies.
type Money = Record<string, number>;

function addMoney(target: Money, currency: string, amount: number) {
  const key = currency.toLowerCase();

  target[key] = (target[key] ?? 0) + amount;
}

// Fetch all pages, up to a bounded limit.
// Never silently report partial totals as complete analytics.
async function collectAll<T extends { id: string }>(
  fetchPage: (startingAfter?: string) => Promise<{
    data: T[];
    has_more: boolean;
  }>
): Promise<T[]> {
  const results: T[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const page = await fetchPage(startingAfter);

    results.push(...page.data);

    if (results.length > MAX_RECORDS) {
      throw new Error(
        "Stripe analytics limit exceeded. Historical sync is required."
      );
    }

    if (!page.has_more) {
      return results;
    }

    const lastItem = page.data[page.data.length - 1];

    if (!lastItem) {
      throw new Error("Invalid Stripe pagination response.");
    }

    startingAfter = lastItem.id;
  }
}

export const getStripeAccountId = async (
  projectId: string
): Promise<string | null> => {
  const [connection] = await db
    .select({
      stripeAccountId: projectIntegrations.providerWorkspaceId,
    })
    .from(projectIntegrations)
    .innerJoin(
      integrations,
      eq(projectIntegrations.integrationId, integrations.id)
    )
    .where(
      and(
        eq(projectIntegrations.projectId, projectId),
        eq(integrations.slug, "stripe"),
        eq(projectIntegrations.status, "connected")
      )
    )
    .limit(1);

  return connection?.stripeAccountId ?? null;
};

export async function getStripeOverview(req: AuthRequest, res: Response) {
  try {
    const projectId =
      typeof req.params.project_id === "string" ? req.params.project_id : "";

    const { workspace_id, days } = stripeAnalyticsSchema.parse(req.query);

    if (typeof projectId !== "string" || !req.user?.id) {
      return res.status(400).json({
        success: false,
        message: "Project and authentication are required.",
      });
    }

    // Replace with your dedicated analytics-view permission
    // before production. This helper must validate workspace
    // membership, project ownership, and access.
    await assertProjectAccess(workspace_id, projectId, req.user.id);

    const dashboardData = await getStripeDashboardData({
      workspaceId: workspace_id,
      projectId,
      days,
    });

    return res.status(200).json({
      success: true,
      data: {
        period: dashboardData.period,
        account: dashboardData.account,
        revenue: {
          gross: dashboardData.revenue.gross,
          refunds: dashboardData.revenue.refunds,
          net_after_refunds: dashboardData.revenue.netAfterRefunds,
          unit: dashboardData.revenue.unit,
          fees_included: dashboardData.revenue.feesIncluded,
        },
        payments: {
          successful_charges: dashboardData.payments.successfulCharges,
          failed_payment_intents: dashboardData.payments.failedPaymentIntents,
          total_payment_intents: dashboardData.payments.totalPaymentIntents,
        },
        subscriptions: dashboardData.subscriptions,
        revenue_by_day: dashboardData.revenueByDay,
      },
    });

    const stripeAccountId = await getStripeAccountId(projectId);

    if (!stripeAccountId) {
      return res.status(404).json({
        success: false,
        message: "Stripe is not connected to this project.",
      });
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 86400000);

    const created = {
      gte: Math.floor(startDate.getTime() / 1000),
      lt: Math.floor(endDate.getTime() / 1000),
    };

    const requestOptions = {
      stripeAccount: stripeAccountId,
    };

    const [charges, paymentIntents, subscriptions] = await Promise.all([
      collectAll((startingAfter) =>
        stripe.charges.list(
          {
            limit: 100,
            created,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          },
          requestOptions
        )
      ),

      collectAll((startingAfter) =>
        stripe.paymentIntents.list(
          {
            limit: 100,
            created,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          },
          requestOptions
        )
      ),

      collectAll((startingAfter) =>
        stripe.subscriptions.list(
          {
            limit: 100,
            status: "all",
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          },
          requestOptions
        )
      ),
    ]);

    const grossRevenue: Money = {};
    const refundedAmount: Money = {};
    const netRevenue: Money = {};

    const successfulCharges = charges.filter(
      (charge) => charge.status === "succeeded" && charge.paid
    );

    // Capture-time revenue for the selected period.
    // This is not a complete Stripe accounting ledger.
    for (const charge of successfulCharges) {
      addMoney(grossRevenue, charge.currency, charge.amount);

      // Partial or full refunds on these charges.
      addMoney(refundedAmount, charge.currency, charge.amount_refunded);
    }

    const currencies = new Set([
      ...Object.keys(grossRevenue),
      ...Object.keys(refundedAmount),
    ]);

    for (const currency of currencies) {
      netRevenue[currency] =
        (grossRevenue[currency] ?? 0) - (refundedAmount[currency] ?? 0);
    }

    const failedPayments = paymentIntents.filter(
      (payment) =>
        payment.status === "requires_payment_method" &&
        payment.last_payment_error !== null
    );

    const activeSubscriptions = subscriptions.filter(
      (subscription) => subscription.status === "active"
    );

    const trialingSubscriptions = subscriptions.filter(
      (subscription) => subscription.status === "trialing"
    );

    const canceledSubscriptions = subscriptions.filter(
      (subscription) => subscription.status === "canceled"
    );

    const revenueByDay = new Map<
      string,
      {
        gross: Money;
        refunds: Money;
      }
    >();

    for (const charge of successfulCharges) {
      const day = new Date(charge.created * 1000).toISOString().slice(0, 10);

      if (!revenueByDay.has(day)) {
        revenueByDay.set(day, {
          gross: {},
          refunds: {},
        });
      }

      const entry = revenueByDay.get(day)!;

      addMoney(entry.gross, charge.currency, charge.amount);

      addMoney(entry.refunds, charge.currency, charge.amount_refunded);
    }

    return res.status(200).json({
      success: true,
      data: {
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          days: days,
        },
        account: {
          id: stripeAccountId,
        },
        revenue: {
          gross: grossRevenue,
          refunds: refundedAmount,
          net_after_refunds: netRevenue,
          unit: "minor",
          fees_included: false,
        },
        payments: {
          successful_charges: successfulCharges.length,
          failed_payment_intents: failedPayments.length,
          total_payment_intents: paymentIntents.length,
        },
        subscriptions: {
          active: activeSubscriptions.length,
          trialing: trialingSubscriptions.length,
          canceled: canceledSubscriptions.length,
          total: subscriptions.length,
          snapshot: true,
        },
        revenue_by_day: [...revenueByDay.entries()]
          .map(([date, values]) => ({
            date,
            ...values,
          }))
          .sort((a, b) => a.date.localeCompare(b.date)),
      },
    });
  } catch (error) {
    console.error("Stripe analytics failed:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid Stripe analytics parameters.",
        errors: z.treeifyError(error),
      });
    }

    const status = (error as { statusCode?: number }).statusCode;

    if (status === 403) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to view analytics.",
      });
    }

    if (status === 404) {
      return res.status(404).json({
        success: false,
        message: "Stripe is not connected to this project.",
      });
    }
    if (status === 429) {
      return res.status(429).json({
        success: false,
        message:
          "Stripe is rate limiting analytics requests. Please try again shortly.",
      });
    }
    if (status === 504) {
      return res.status(504).json({
        success: false,
        message: "Stripe analytics took too long to respond.",
      });
    }

    return res.status(502).json({
      success: false,
      message: "Unable to retrieve Stripe analytics.",
    });
  }
}
