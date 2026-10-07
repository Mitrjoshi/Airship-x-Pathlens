import { and, desc, eq, gt, isNull, or } from "drizzle-orm";
import { db } from "../db/client";
import { projectApiKeys } from "../db/schema";

export class ProjectApiKeyDeletionError extends Error {
  constructor() {
    super("A project must have at least one active API key.");
    this.name = "ProjectApiKeyDeletionError";
  }
}

export const listProjectApiKeysModel = async (projectId: string) => {
  return db
    .select({
      id: projectApiKeys.id,
      name: projectApiKeys.name,
      keyPrefix: projectApiKeys.keyPrefix,
      secretEncrypted: projectApiKeys.secretEncrypted,
      scopes: projectApiKeys.scopes,
      expiresAt: projectApiKeys.expiresAt,
      revokedAt: projectApiKeys.revokedAt,
      lastUsedAt: projectApiKeys.lastUsedAt,
      createdAt: projectApiKeys.createdAt,
    })
    .from(projectApiKeys)
    .where(eq(projectApiKeys.projectId, projectId))
    .orderBy(desc(projectApiKeys.createdAt));
};

export const createProjectApiKeyModel = async (data: {
  projectId: string;
  name: string;
  keyPrefix: string;
  secretHash: string;
  secretEncrypted: string;
  scopes: readonly string[];
  expiresAt: Date | null;
}) => {
  const [key] = await db.insert(projectApiKeys).values(data).returning({
    id: projectApiKeys.id,
    name: projectApiKeys.name,
    keyPrefix: projectApiKeys.keyPrefix,
    scopes: projectApiKeys.scopes,
    expiresAt: projectApiKeys.expiresAt,
    createdAt: projectApiKeys.createdAt,
  });

  return key;
};

export const revokeProjectApiKeyModel = async (data: {
  projectId: string;
  keyId: string;
}) => {
  return db.transaction(async (transaction) => {
    const now = new Date();
    const activeKeys = await transaction
      .select({ id: projectApiKeys.id })
      .from(projectApiKeys)
      .where(
        and(
          eq(projectApiKeys.projectId, data.projectId),
          isNull(projectApiKeys.revokedAt),
          or(
            isNull(projectApiKeys.expiresAt),
            gt(projectApiKeys.expiresAt, now)
          )
        )
      )
      .for("update");

    if (!activeKeys.some((key) => key.id === data.keyId)) return undefined;

    if (activeKeys.length <= 1) {
      throw new ProjectApiKeyDeletionError();
    }

    const [key] = await transaction
      .update(projectApiKeys)
      .set({ revokedAt: now })
      .where(
        and(
          eq(projectApiKeys.id, data.keyId),
          eq(projectApiKeys.projectId, data.projectId),
          isNull(projectApiKeys.revokedAt)
        )
      )
      .returning({
        id: projectApiKeys.id,
        name: projectApiKeys.name,
        keyPrefix: projectApiKeys.keyPrefix,
        scopes: projectApiKeys.scopes,
        expiresAt: projectApiKeys.expiresAt,
        revokedAt: projectApiKeys.revokedAt,
      });

    return key;
  });
};

export const updateProjectApiKeyModel = async (data: {
  projectId: string;
  keyId: string;
  name: string;
  scopes: readonly string[];
  expiresAt: Date | null;
}) => {
  const [key] = await db
    .update(projectApiKeys)
    .set({
      name: data.name,
      scopes: data.scopes,
      expiresAt: data.expiresAt,
    })
    .where(
      and(
        eq(projectApiKeys.id, data.keyId),
        eq(projectApiKeys.projectId, data.projectId),
        isNull(projectApiKeys.revokedAt)
      )
    )
    .returning({
      id: projectApiKeys.id,
      name: projectApiKeys.name,
      keyPrefix: projectApiKeys.keyPrefix,
      secretEncrypted: projectApiKeys.secretEncrypted,
      scopes: projectApiKeys.scopes,
      expiresAt: projectApiKeys.expiresAt,
      revokedAt: projectApiKeys.revokedAt,
      lastUsedAt: projectApiKeys.lastUsedAt,
      createdAt: projectApiKeys.createdAt,
    });

  return key;
};
