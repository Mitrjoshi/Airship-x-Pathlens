import type { Response } from "express";
import { z, ZodError } from "zod";
import type { AuthRequest } from "../lib/jwt";
import { TRACKING_SCOPES } from "../lib/project-api-keys";
import {
  createProjectApiKeyModel,
  ProjectApiKeyDeletionError,
  listProjectApiKeysModel,
  revokeProjectApiKeyModel,
  updateProjectApiKeyModel,
} from "../models/project-api-keys.model";
import { getProjectWorkspaceIdModel } from "../models/projects.model";
import { generateApiKey, hashApiKey } from "../utils/utils";
import { decryptApiKey, encryptApiKey } from "../lib/api-key-encryption";
import { createAuditLog } from "../models/audit-logs.model";

const projectParamsSchema = z.object({
  project_id: z.string().uuid(),
});

const keyParamsSchema = projectParamsSchema.extend({
  key_id: z.string().uuid(),
});

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z
    .array(z.enum(TRACKING_SCOPES))
    .min(1)
    .default([...TRACKING_SCOPES]),
  expiresAt: z.coerce
    .date()
    .nullable()
    .optional()
    .refine((value) => !value || value.getTime() > Date.now(), {
      message: "Expiry must be in the future.",
    }),
});

const updateKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
  scopes: z.array(z.enum(TRACKING_SCOPES)).min(1),
  expiresAt: z.coerce
    .date()
    .nullable()
    .refine((value) => !value || value.getTime() > Date.now(), {
      message: "Expiry must be in the future.",
    }),
});

function sendValidationError(error: unknown, res: Response): boolean {
  if (!(error instanceof ZodError)) return false;

  res.status(400).json({
    success: false,
    message: error.issues[0]?.message ?? "Validation failed.",
  });
  return true;
}

async function auditProjectApiKey(
  req: AuthRequest,
  projectId: string,
  action: string,
  key: {
    id: string;
    name?: string;
    keyPrefix?: string;
    scopes?: readonly string[];
    expiresAt?: Date | null;
  }
) {
  if (!req.user?.id) return;

  const workspaceId = await getProjectWorkspaceIdModel(projectId);
  if (!workspaceId) return;

  await createAuditLog({
    workspaceId,
    actorUserId: req.user.id,
    projectId,
    action,
    resourceType: "project_api_key",
    resourceId: key.id,
    metadata: {
      projectId,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      expiresAt: key.expiresAt,
    },
  });
}

export async function listProjectApiKeys(req: AuthRequest, res: Response) {
  try {
    const { project_id } = projectParamsSchema.parse(req.params);
    const keys = (await listProjectApiKeysModel(project_id)).map(
      ({ secretEncrypted, ...key }) => ({
        ...key,
        secret: secretEncrypted ? decryptApiKey(secretEncrypted) : null,
      })
    );

    return res.json({ success: true, data: keys });
  } catch (error) {
    if (sendValidationError(error, res)) return;
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Unable to load project API keys.",
    });
  }
}

export async function createProjectApiKey(req: AuthRequest, res: Response) {
  try {
    const { project_id } = projectParamsSchema.parse(req.params);
    const payload = createKeySchema.parse(req.body ?? {});
    const workspaceId = await getProjectWorkspaceIdModel(project_id);

    if (!workspaceId) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    const secret = generateApiKey("plk");
    const key = await createProjectApiKeyModel({
      projectId: project_id,
      name: payload.name,
      keyPrefix: secret.slice(0, 12),
      secretHash: hashApiKey(secret),
      secretEncrypted: encryptApiKey(secret),
      scopes: payload.scopes,
      expiresAt: payload.expiresAt ?? null,
    });

    if (key) {
      await auditProjectApiKey(req, project_id, "project_api_key.created", key);
    }

    return res.status(201).json({
      success: true,
      data: {
        ...key,
        secret,
      },
    });
  } catch (error) {
    if (sendValidationError(error, res)) return;
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Unable to create project API key.",
    });
  }
}

async function handleRevokeProjectApiKey(
  req: AuthRequest,
  res: Response,
  action: "project_api_key.revoked" | "project_api_key.deleted"
) {
  try {
    const { project_id, key_id } = keyParamsSchema.parse(req.params);
    const key = await revokeProjectApiKeyModel({
      projectId: project_id,
      keyId: key_id,
    });

    if (!key) {
      return res.status(404).json({
        success: false,
        message: "Active project API key not found.",
      });
    }

    await auditProjectApiKey(req, project_id, action, key);

    return res.json({ success: true, data: key });
  } catch (error) {
    if (sendValidationError(error, res)) return;
    console.error(error);
    return res
      .status(error instanceof ProjectApiKeyDeletionError ? 409 : 500)
      .json({
        success: false,
        message:
          error instanceof ProjectApiKeyDeletionError
            ? error.message
            : action === "project_api_key.deleted"
              ? "Unable to delete project API key."
              : "Unable to revoke project API key.",
      });
  }
}

export async function revokeProjectApiKey(req: AuthRequest, res: Response) {
  return handleRevokeProjectApiKey(req, res, "project_api_key.revoked");
}

export async function deleteProjectApiKey(req: AuthRequest, res: Response) {
  return handleRevokeProjectApiKey(req, res, "project_api_key.deleted");
}

export async function updateProjectApiKey(req: AuthRequest, res: Response) {
  try {
    const { project_id, key_id } = keyParamsSchema.parse(req.params);
    const payload = updateKeySchema.parse(req.body ?? {});
    const key = await updateProjectApiKeyModel({
      projectId: project_id,
      keyId: key_id,
      name: payload.name,
      scopes: payload.scopes,
      expiresAt: payload.expiresAt,
    });

    if (!key) {
      return res.status(404).json({
        success: false,
        message: "Active project API key not found.",
      });
    }

    await auditProjectApiKey(req, project_id, "project_api_key.updated", key);

    const { secretEncrypted, ...updatedKey } = key;

    return res.json({
      success: true,
      data: {
        ...updatedKey,
        secret: secretEncrypted ? decryptApiKey(secretEncrypted) : null,
      },
    });
  } catch (error) {
    if (sendValidationError(error, res)) return;
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Unable to update project API key.",
    });
  }
}
