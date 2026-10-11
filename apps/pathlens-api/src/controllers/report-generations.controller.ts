import type { Response } from "express";
import { z, ZodError } from "zod";

import type { AuthRequest } from "../lib/jwt";
import {
  generateReportWorkbook,
  REPORT_MIME_TYPE,
  type ReportType,
} from "../lib/report-generator";
import { createReportSignedUrl, uploadReport } from "../lib/s3";
import { getAnalyticsModel } from "../models/analytics.model";
import { createAuditLog } from "../models/audit-logs.model";
import {
  completeReportGeneration,
  createReportGeneration,
  failReportGeneration,
  getReportGenerationById,
  getReportGenerations,
} from "../models/report-generations.model";
import { getProjectWorkspaceIdModel } from "../models/projects.model";
import type { reportGenerations } from "../db/schema";

const reportPayloadSchema = z.object({
  workspace_id: z.uuid(),
  project_id: z.uuid().optional(),
  report_type: z.enum([
    "full",
    "overview",
    "traffic",
    "pages",
    "devices",
    "referrers",
    "countries",
    "browsers",
  ]),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
  device: z.enum(["all", "desktop", "mobile", "tablet"]).default("all"),
  domain: z.string().trim().max(2048).optional(),
});

const reportListQuerySchema = z.object({
  workspace_id: z.uuid(),
  project_id: z.uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(50),
});

const reportDownloadQuerySchema = z.object({
  workspace_id: z.uuid(),
});

function serializeReportGeneration(
  row: typeof reportGenerations.$inferSelect,
  downloadUrl: string | null = null
) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    projectId: row.projectId,
    actorUserId: row.actorUserId,
    reportType: row.reportType,
    filters: row.filters,
    status: row.status,
    fileName: row.fileName,
    fileSize: row.fileSize,
    downloadUrl,
    error: row.error,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
  };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to generate report.";
}

export async function generateReportController(
  req: AuthRequest,
  res: Response
) {
  try {
    const payload = reportPayloadSchema.parse(req.body);
    const actorUserId = req.user?.id;

    if (!actorUserId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    if (payload.project_id) {
      const projectWorkspaceId = await getProjectWorkspaceIdModel(
        payload.project_id
      );

      if (projectWorkspaceId !== payload.workspace_id) {
        return res.status(404).json({
          success: false,
          message: "Project not found in this workspace.",
        });
      }
    }

    const generationId = await createReportGeneration({
      workspaceId: payload.workspace_id,
      projectId: payload.project_id,
      actorUserId,
      reportType: payload.report_type,
      filters: {
        range: payload.range,
        device: payload.device,
        domain: payload.domain,
      },
    });

    try {
      const analytics = await getAnalyticsModel({
        workspaceId: payload.workspace_id,
        projectId: payload.project_id,
        range: payload.range,
        device: payload.device,
        domain: payload.domain,
      });
      const workbook = await generateReportWorkbook({
        reportType: payload.report_type as ReportType,
        analytics,
        filters: {
          range: payload.range,
          device: payload.device,
          domain: payload.domain,
        },
      });
      const fileName = `pathlens-report-${payload.report_type}-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      const storagePath = `reports/${payload.workspace_id}/${
        payload.project_id ?? "workspace"
      }/${generationId}.xlsx`;

      await uploadReport(storagePath, workbook, REPORT_MIME_TYPE);

      const downloadUrl = await createReportSignedUrl(storagePath, fileName);

      const completed = await completeReportGeneration({
        id: generationId,
        storagePath,
        fileName,
        mimeType: REPORT_MIME_TYPE,
        fileSize: workbook.length,
      });

      if (!completed) throw new Error("Unable to save completed report.");

      await createAuditLog({
        workspaceId: payload.workspace_id,
        actorUserId,
        projectId: payload.project_id,
        action: "report.generated",
        resourceType: "report_generation",
        resourceId: generationId,
        metadata: {
          reportType: payload.report_type,
          range: payload.range,
          device: payload.device,
          domain: payload.domain ?? null,
          fileName,
          fileSize: workbook.length,
        },
      });

      return res.status(201).json({
        success: true,
        data: {
          ...serializeReportGeneration(completed),
          downloadUrl,
        },
      });
    } catch (error) {
      await failReportGeneration(generationId, getErrorMessage(error));
      throw error;
    }
  } catch (error) {
    if (!(error instanceof ZodError))
      console.error("Unable to generate report", error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message:
        error instanceof ZodError
          ? "Invalid report payload."
          : getErrorMessage(error),
    });
  }
}

export async function getReportGenerationsController(
  req: AuthRequest,
  res: Response
) {
  try {
    const query = reportListQuerySchema.parse(req.query);
    const result = await getReportGenerations({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      page: query.page,
      pageSize: query.page_size,
    });
    const data = await Promise.all(
      result.rows.map(async (row) => {
        if (row.status !== "completed" || !row.storagePath) {
          return serializeReportGeneration(row);
        }

        try {
          const downloadUrl = await createReportSignedUrl(
            row.storagePath,
            row.fileName ?? "report.xlsx"
          );
          return serializeReportGeneration(row, downloadUrl);
        } catch (error) {
          console.error("Unable to create report download URL", error);
          return serializeReportGeneration(row);
        }
      })
    );

    return res.status(200).json({
      success: true,
      data,
      pagination: {
        page: query.page,
        pageSize: query.page_size,
        total: result.total,
        totalPages: Math.ceil(result.total / query.page_size),
        hasNextPage: query.page * query.page_size < result.total,
      },
    });
  } catch (error) {
    if (!(error instanceof ZodError))
      console.error("Unable to load reports", error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message:
        error instanceof ZodError
          ? "Invalid report query."
          : "Unable to load reports.",
    });
  }
}

export async function downloadReportController(
  req: AuthRequest,
  res: Response
) {
  try {
    const query = reportDownloadQuerySchema.parse(req.query);
    const reportId = z.uuid().parse(req.params.report_id);
    const report = await getReportGenerationById({
      id: reportId,
      workspaceId: query.workspace_id,
    });

    if (!report || report.status !== "completed" || !report.storagePath) {
      return res.status(404).json({
        success: false,
        message: "Completed report not found.",
      });
    }

    const downloadUrl = await createReportSignedUrl(
      report.storagePath,
      report.fileName ?? "report.xlsx"
    );
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    return res.status(200).json({
      success: true,
      data: { id: report.id, downloadUrl, expiresAt },
    });
  } catch (error) {
    if (!(error instanceof ZodError))
      console.error("Unable to download report", error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message:
        error instanceof ZodError
          ? "Invalid report download request."
          : "Unable to create report download URL.",
    });
  }
}
