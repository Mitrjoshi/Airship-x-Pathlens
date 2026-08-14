import type { Request, Response } from "express";
import { z, ZodError } from "zod";
import type { AuthRequest } from "../lib/jwt";
import {
  createDashboardModel,
  createDashboardWidgetModel,
  deleteDashboardModel,
  deleteDashboardWidgetModel,
  getDashboardByIdModel,
  getDashboardsModel,
  updateDashboardModel,
  updateDashboardWidgetModel,
} from "../models/dashboards.model";
import {
  dashboardCreatePayloadSchema,
  dashboardUpdatePayloadSchema,
  dashboardWidgetCreatePayloadSchema,
  dashboardWidgetUpdatePayloadSchema,
} from "@workspace/contracts";

const dashboardParamsSchema = z.object({
  dashboard_id: z.string().trim().min(1),
});

const widgetParamsSchema = z.object({
  dashboard_id: z.string().trim().min(1),
  widget_id: z.string().trim().min(1),
});

const dashboardScopeSchema = z.object({
  workspace_id: z.string().trim().min(1),
  project_id: z.string().trim().min(1),
});

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Validation failed.";
  }

  if (error instanceof Error) return error.message;

  return fallback;
}

function getErrorStatus(error: unknown): number {
  return error instanceof ZodError ? 400 : 500;
}

export async function getDashboards(req: Request, res: Response) {
  try {
    const scope = dashboardScopeSchema.parse(req.query);
    const dashboards = await getDashboardsModel(
      scope.workspace_id,
      scope.project_id
    );

    return res.status(200).json({ success: true, data: dashboards });
  } catch (error) {
    console.error(error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to load dashboards."),
    });
  }
}

export async function getDashboard(req: Request, res: Response) {
  try {
    const params = dashboardParamsSchema.parse(req.params);
    const scope = dashboardScopeSchema.parse(req.query);
    const dashboard = await getDashboardByIdModel({
      id: params.dashboard_id,
      workspaceId: scope.workspace_id,
      projectId: scope.project_id,
    });

    if (!dashboard) {
      return res.status(404).json({
        success: false,
        message: "Dashboard not found.",
      });
    }

    return res.status(200).json({ success: true, data: dashboard });
  } catch (error) {
    console.error(error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to load dashboard."),
    });
  }
}

export async function createDashboard(req: AuthRequest, res: Response) {
  try {
    const payload = dashboardCreatePayloadSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const id = await createDashboardModel({
      workspaceId: payload.workspace_id,
      projectId: payload.project_id,
      name: payload.name,
      description: payload.description ?? null,
      createdBy: userId,
    });

    return res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    console.error(error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to create dashboard."),
    });
  }
}

export async function updateDashboard(req: Request, res: Response) {
  try {
    const params = dashboardParamsSchema.parse(req.params);
    const payload = dashboardUpdatePayloadSchema.parse(req.body);
    const updated = await updateDashboardModel({
      id: params.dashboard_id,
      workspaceId: payload.workspace_id,
      projectId: payload.project_id,
      name: payload.name,
      description: payload.description,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Dashboard not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dashboard updated.",
    });
  } catch (error) {
    console.error(error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to update dashboard."),
    });
  }
}

export async function deleteDashboard(req: Request, res: Response) {
  try {
    const params = dashboardParamsSchema.parse(req.params);
    const scope = dashboardScopeSchema.parse(req.query);
    const deleted = await deleteDashboardModel({
      id: params.dashboard_id,
      workspaceId: scope.workspace_id,
      projectId: scope.project_id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Dashboard not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Dashboard deleted.",
    });
  } catch (error) {
    console.error(error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to delete dashboard."),
    });
  }
}

export async function createDashboardWidget(req: Request, res: Response) {
  try {
    const params = dashboardParamsSchema.parse(req.params);
    const payload = dashboardWidgetCreatePayloadSchema.parse(req.body);
    const id = await createDashboardWidgetModel({
      dashboardId: params.dashboard_id,
      ...payload,
    });

    if (!id) {
      return res.status(404).json({
        success: false,
        message: "Dashboard not found.",
      });
    }

    return res.status(201).json({ success: true, data: { id } });
  } catch (error) {
    console.error(error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to create widget."),
    });
  }
}

export async function updateDashboardWidget(req: Request, res: Response) {
  try {
    const params = widgetParamsSchema.parse(req.params);
    const payload = dashboardWidgetUpdatePayloadSchema.parse(req.body);
    const updated = await updateDashboardWidgetModel({
      id: params.widget_id,
      dashboardId: params.dashboard_id,
      workspaceId: payload.workspace_id,
      projectId: payload.project_id,
      title: payload.title,
      config: payload.config,
      layout: payload.layout,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Widget not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Widget updated.",
    });
  } catch (error) {
    console.error(error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to update widget."),
    });
  }
}

export async function deleteDashboardWidget(req: Request, res: Response) {
  try {
    const params = widgetParamsSchema.parse(req.params);
    const scope = dashboardScopeSchema.parse(req.query);
    const deleted = await deleteDashboardWidgetModel({
      id: params.widget_id,
      dashboardId: params.dashboard_id,
      workspaceId: scope.workspace_id,
      projectId: scope.project_id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Widget not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Widget deleted.",
    });
  } catch (error) {
    console.error(error);

    return res.status(getErrorStatus(error)).json({
      success: false,
      message: getErrorMessage(error, "Unable to delete widget."),
    });
  }
}
