import { and, eq } from "drizzle-orm";
import type { Response } from "express";
import { z, ZodError } from "zod";

import type { AuthRequest } from "../lib/jwt";
import { db } from "../db/client";
import {
  integrations,
  projectDomains,
  projectIntegrations,
} from "../db/schema";
import { encryptIntegrationCredentials } from "../lib/credential-encryption";
import {
  PageSpeedApiError,
  runPageSpeedInsights,
} from "../lib/google-pagespeed";
import { getProjectIntegrationBySlugModel } from "../models/project-integrations.model";

const PROJECT_SPEED_SLUG = "pagespeed-insights";
const paramsSchema = z.object({ project_id: z.uuid() });
const checkSchema = z.object({
  domainId: z.uuid(),
  strategy: z.enum(["mobile", "desktop"]).default("mobile"),
});

function errorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return {
      status: 400,
      message: error.issues[0]?.message ?? "Invalid request.",
    };
  }
  if (error instanceof PageSpeedApiError) {
    return { status: error.statusCode, message: error.message };
  }
  return { status: 500, message: "Something went wrong." };
}

export async function installGooglePageSpeed(req: AuthRequest, res: Response) {
  try {
    const { project_id: projectId } = paramsSchema.parse(req.params);
    if (!process.env.GOOGLE_INTEGRATION) {
      throw new PageSpeedApiError(
        "Google PageSpeed Insights is not configured.",
        503
      );
    }
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const [integration] = await db
      .select({ id: integrations.id })
      .from(integrations)
      .where(eq(integrations.slug, PROJECT_SPEED_SLUG))
      .limit(1);
    if (!integration) {
      return res
        .status(404)
        .json({ success: false, message: "PageSpeed integration not found." });
    }

    const [connection] = await db
      .insert(projectIntegrations)
      .values({
        projectId,
        integrationId: integration.id,
        providerWorkspaceId: PROJECT_SPEED_SLUG,
        providerWorkspaceName: "Google PageSpeed Insights",
        encryptedCredentials: encryptIntegrationCredentials({ managed: true }),
        status: "connected",
        connectedByUserId: req.user.id,
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
          status: "connected",
          connectedByUserId: req.user.id,
          connectedAt: new Date(),
          updatedAt: new Date(),
          lastError: null,
        },
      })
      .returning({ id: projectIntegrations.id });

    return res
      .status(200)
      .json({ success: true, data: { id: connection?.id } });
  } catch (error) {
    const result = errorResponse(error);
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }
}

export async function checkGooglePageSpeed(req: AuthRequest, res: Response) {
  try {
    const { project_id: projectId } = paramsSchema.parse(req.params);
    const { domainId, strategy } = checkSchema.parse(req.body);
    const connection = await getProjectIntegrationBySlugModel(
      projectId,
      PROJECT_SPEED_SLUG
    );
    if (!connection || connection.connection.status !== "connected") {
      return res.status(404).json({
        success: false,
        message: "Google PageSpeed Insights is not installed.",
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

    const result = await runPageSpeedInsights(domain.domain, strategy);
    return res.json({ success: true, data: result });
  } catch (error) {
    const result = errorResponse(error);
    return res
      .status(result.status)
      .json({ success: false, message: result.message });
  }
}
