import { and, count, desc, eq } from "drizzle-orm";

import { db } from "../db/client";
import { reportGenerations } from "../db/schema";

export type ReportGenerationStatus = "generating" | "completed" | "failed";

export async function createReportGeneration(data: {
  workspaceId: string;
  projectId?: string | null;
  actorUserId: string;
  reportType: string;
  filters: Record<string, unknown>;
}) {
  const [generation] = await db
    .insert(reportGenerations)
    .values({
      workspaceId: data.workspaceId,
      projectId: data.projectId ?? null,
      actorUserId: data.actorUserId,
      reportType: data.reportType,
      filters: data.filters,
    })
    .returning({ id: reportGenerations.id });

  if (!generation) throw new Error("Unable to create report generation.");

  return generation.id;
}

export async function completeReportGeneration(data: {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}) {
  const [generation] = await db
    .update(reportGenerations)
    .set({
      status: "completed",
      storagePath: data.storagePath,
      fileName: data.fileName,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      completedAt: new Date(),
      error: null,
    })
    .where(eq(reportGenerations.id, data.id))
    .returning();

  return generation ?? null;
}

export async function failReportGeneration(id: string, error: string) {
  await db
    .update(reportGenerations)
    .set({ status: "failed", error, completedAt: new Date() })
    .where(eq(reportGenerations.id, id));
}

export async function getReportGenerationById(data: {
  id: string;
  workspaceId: string;
}) {
  const [generation] = await db
    .select()
    .from(reportGenerations)
    .where(
      and(
        eq(reportGenerations.id, data.id),
        eq(reportGenerations.workspaceId, data.workspaceId)
      )
    );

  return generation ?? null;
}

export async function getReportGenerations(data: {
  workspaceId: string;
  projectId?: string;
  page: number;
  pageSize: number;
}) {
  const filters = [eq(reportGenerations.workspaceId, data.workspaceId)];

  if (data.projectId) {
    filters.push(eq(reportGenerations.projectId, data.projectId));
  }

  const offset = (data.page - 1) * data.pageSize;
  const where = and(...filters);

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(reportGenerations)
      .where(where)
      .orderBy(desc(reportGenerations.createdAt))
      .limit(data.pageSize)
      .offset(offset),
    db.select({ total: count() }).from(reportGenerations).where(where),
  ]);

  return { rows, total: totalResult[0]?.total ?? 0 };
}
