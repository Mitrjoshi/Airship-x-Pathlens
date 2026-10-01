import { and, count, desc, eq, ilike, or } from "drizzle-orm";

import { db } from "../db/client";
import { auditLogs, users } from "../db/schema";

export type AuditLogMetadata = Record<string, unknown>;

export async function createAuditLog(data: {
  workspaceId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: AuditLogMetadata;
}): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      workspaceId: data.workspaceId,
      actorUserId: data.actorUserId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId ?? null,
      metadata: data.metadata ?? null,
    });
  } catch (error) {
    // A failed audit write must not turn a completed user mutation into a 500.
    console.error("Unable to write audit log", error);
  }
}

type AuditLogFilters = {
  workspaceId: string;
  action?: string;
  resourceType?: string;
  actorUserId?: string;
  projectId?: string;
  search?: string;
};

function getAuditLogFilters(data: AuditLogFilters) {
  const filters = [eq(auditLogs.workspaceId, data.workspaceId)];

  if (data.action) filters.push(eq(auditLogs.action, data.action));
  if (data.resourceType) {
    filters.push(eq(auditLogs.resourceType, data.resourceType));
  }
  if (data.actorUserId) {
    filters.push(eq(auditLogs.actorUserId, data.actorUserId));
  }
  if (data.projectId) {
    filters.push(eq(auditLogs.resourceId, data.projectId));
  }
  if (data.search) {
    const pattern = `%${data.search}%`;
    filters.push(
      or(
        ilike(auditLogs.action, pattern),
        ilike(auditLogs.resourceType, pattern),
        ilike(users.name, pattern),
        ilike(users.email, pattern)
      )!
    );
  }

  return filters;
}

export async function getAuditLogs(
  data: AuditLogFilters & {
    page: number;
    pageSize: number;
  }
) {
  const offset = (data.page - 1) * data.pageSize;
  const filters = getAuditLogFilters(data);

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: auditLogs.id,
        workspaceId: auditLogs.workspaceId,
        actor: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
      })
      .from(auditLogs)
      .innerJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(and(...filters))
      .orderBy(desc(auditLogs.createdAt))
      .limit(data.pageSize)
      .offset(offset),
    db
      .select({ total: count() })
      .from(auditLogs)
      .innerJoin(users, eq(users.id, auditLogs.actorUserId))
      .where(and(...filters)),
  ]);

  return {
    rows,
    total: totalResult[0]?.total ?? 0,
  };
}
