import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import {
  SUPPORT_MAX_TOTAL_SIZE,
  supportContentType,
  type CreateSupportRequestInput,
  type SupportUploadInput,
} from "@workspace/contracts";
import { db } from "../db/client";
import {
  projects,
  supportAttachments,
  supportRequests,
  workspaceMembers,
} from "../db/schema";
import { SupportError } from "../support/errors";
import {
  createSupportUpload,
  finalizeSupportUpload,
  supportBucket,
  SUPPORT_UPLOAD_TTL_SECONDS,
} from "../support/storage";

export async function assertSupportAccess(
  userId: string,
  scope: { workspace_id: string; project_id: string | null }
) {
  const [member] = await db
    .select({ id: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.userId, userId),
        eq(workspaceMembers.workspaceId, scope.workspace_id)
      )
    )
    .limit(1);
  if (!member) throw new SupportError(403, "Workspace access denied.");
  if (scope.project_id) {
    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, scope.project_id),
          eq(projects.workspaceId, scope.workspace_id)
        )
      )
      .limit(1);
    if (!project) throw new SupportError(403, "Project access denied.");
  }
}

export async function createSupportUploadsModel(
  userId: string,
  data: SupportUploadInput
) {
  const bucket = supportBucket();
  const expiresAt = new Date(Date.now() + SUPPORT_UPLOAD_TTL_SECONDS * 1000);
  const rows = data.files.map((file) => {
    const id = randomUUID();
    return {
      id,
      userId,
      workspaceId: data.workspace_id,
      projectId: data.project_id,
      name: file.name,
      contentType: supportContentType(file.name, file.content_type)!,
      size: file.size,
      bucket,
      storageKey: `support/pending/${userId}/${id}`,
      expiresAt,
    };
  });
  const uploads = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      ...(await createSupportUpload(row)),
    }))
  );
  await db.insert(supportAttachments).values(rows);
  return uploads;
}

export async function createSupportRequestModel(
  userId: string,
  data: CreateSupportRequestInput
) {
  return db.transaction(async (tx) => {
    // Row locks serialize concurrent submissions using the same upload IDs.
    const attachments = data.attachment_ids.length
      ? await tx
          .select()
          .from(supportAttachments)
          .where(
            and(
              inArray(supportAttachments.id, [...data.attachment_ids].sort()),
              eq(supportAttachments.userId, userId),
              eq(supportAttachments.workspaceId, data.workspace_id)
            )
          )
          .orderBy(supportAttachments.id)
          .for("update")
      : [];
    if (
      attachments.length !== data.attachment_ids.length ||
      attachments.some(
        (file) =>
          file.requestId !== null ||
          file.expiresAt <= new Date() ||
          file.projectId !== data.project_id
      )
    ) {
      throw new SupportError(
        409,
        "Attachments are invalid, expired or already used. Please upload them again."
      );
    }
    if (
      attachments.reduce((sum, file) => sum + file.size, 0) >
      SUPPORT_MAX_TOTAL_SIZE
    ) {
      throw new SupportError(400, "Total attachment size cannot exceed 25 MB.");
    }
    const [request] = await tx
      .insert(supportRequests)
      .values({
        userId,
        workspaceId: data.workspace_id,
        projectId: data.project_id,
        issueId: data.issue_id,
        severity: data.severity,
        subject: data.subject,
        services: data.service,
        message: data.message,
      })
      .returning({
        id: supportRequests.id,
        createdAt: supportRequests.createdAt,
      });
    for (const attachment of attachments) {
      const storageKey = `support/requests/${request.id}/${attachment.id}`;
      await finalizeSupportUpload(attachment, storageKey);
      await tx
        .update(supportAttachments)
        .set({ requestId: request.id, storageKey })
        .where(eq(supportAttachments.id, attachment.id));
    }
    return request;
  });
}
