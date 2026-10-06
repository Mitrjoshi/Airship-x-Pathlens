import { Response } from "express";
import { z, ZodError } from "zod";
import type { AuthRequest } from "../lib/jwt";
import { generateApiKey } from "../utils/utils";
import type { TrackingScope } from "../lib/project-api-keys";
import {
  createProjectModel,
  deleteProjectModel,
  getEmptyProjectSnapshot,
  getProjectsModel,
  getProjectSnapshotsModel,
  getProjectStatsModel,
  getProjectWorkspaceIdModel,
  updateProjectModel,
} from "../models/projects.model";
import { createAuditLog } from "../models/audit-logs.model";
import { enqueueProjectSnapshot } from "../lib/snapshot-queue";
import { WorkspaceUsageLimitError } from "../lib/usage-limits";

const createProjectSchema = z.object({
  name: z.string({
    error: "Please enter a project name.",
  }),
  description: z
    .string({
      error: "Please enter a project description.",
    })
    .nullable(),
  domain: z
    .string({
      error: "Please enter a project domain.",
    })
    .nullable(),
  captureReplay: z.boolean().default(true),
  capturePerformance: z.boolean().default(true),
  captureErrors: z.boolean().default(false),
  workspace_id: z.string({
    error: "Please enter a workspace id.",
  }),
});

export async function createProject(req: AuthRequest, res: Response) {
  try {
    const {
      description,
      name,
      domain,
      captureReplay,
      capturePerformance,
      captureErrors,
      workspace_id,
    } = createProjectSchema.parse(req.body);

    const api_key = generateApiKey("plk");
    const scopes: TrackingScope[] = ["events"];

    if (captureReplay) scopes.push("replay");
    if (capturePerformance) scopes.push("performance");
    if (captureErrors) scopes.push("errors");

    const project = await createProjectModel({
      name,
      description,
      api_key,
      scopes,
      domain,
      workspace_id,
    });

    const projectId = project[0].id;

    if (req.user?.id) {
      await createAuditLog({
        workspaceId: workspace_id,
        actorUserId: req.user.id,
        action: "project.created",
        resourceType: "project",
        resourceId: projectId,
        metadata: {
          name,
          description,
          domain,
          captureReplay,
          capturePerformance,
          captureErrors,
        },
      });

      await createAuditLog({
        workspaceId: workspace_id,
        actorUserId: req.user.id,
        action: "project_api_key.created",
        resourceType: "project_api_key",
        resourceId: project[0].apiKeyId,
        metadata: {
          projectId,
          name: "Default tracker key",
          keyPrefix: api_key.slice(0, 12),
          scopes,
          expiresAt: null,
        },
      });
    }

    if (domain) await enqueueProjectSnapshot(projectId);

    res.status(200).send({
      success: true,
      data: {
        id: projectId,
        apiKey: {
          id: project[0].apiKeyId,
          name: "Default tracker key",
          secret: api_key,
          scopes,
          expiresAt: null,
        },
      },
    });
  } catch (error) {
    console.error(error);

    let errorMessage = "Something went wrong";

    if (error instanceof ZodError) {
      errorMessage = error.issues[0]?.message ?? "Validation failed";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res
      .status(
        error instanceof WorkspaceUsageLimitError
          ? 409
          : error instanceof ZodError
            ? 400
            : 500
      )
      .json({
        success: false,
        message: errorMessage,
      });
  }
}

const getProjectSchema = z.object({
  workspace_id: z.string({
    error: "Please enter a workspace id.",
  }),
  project_id: z.string().optional(),
});

const updateProjectParamsSchema = z.object({
  project_id: z.string({
    error: "Project ID is required.",
  }),
});

const updateProjectSchema = z.object({
  name: z
    .string({
      error: "Please enter a project name.",
    })
    .trim()
    .min(2, "Project name must be at least 2 characters.")
    .max(80, "Project name must be 80 characters or less."),
  description: z
    .string({
      error: "Please enter a project description.",
    })
    .trim()
    .max(100, "Project description must be 100 characters or less.")
    .nullable(),
  domain: z
    .string({
      error: "Please enter a project domain.",
    })
    .trim()
    .max(2048, "Project domain must be 2048 characters or less.")
    .nullable(),
});

export async function getProjects(req: AuthRequest, res: Response) {
  try {
    const { workspace_id, project_id } = getProjectSchema.parse(req.query);

    const projects = await getProjectsModel(workspace_id, project_id);
    const snapshots = await getProjectSnapshotsModel(
      projects.map((project) => project.id)
    );

    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const stats = await getProjectStatsModel(
          project.id,
          Boolean(project_id)
        );

        return {
          ...project,
          snapshot: snapshots.get(project.id) ?? getEmptyProjectSnapshot(),
          stats,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: projectsWithStats,
    });
  } catch (error) {
    console.error(error);

    let errorMessage = "Something went wrong";

    if (error instanceof ZodError) {
      errorMessage = error.issues[0]?.message ?? "Validation failed";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(400).json({
      success: false,
      message: errorMessage,
    });
  }
}

export async function updateProject(req: AuthRequest, res: Response) {
  try {
    const { project_id } = updateProjectParamsSchema.parse(req.params);
    const payload = updateProjectSchema.parse(req.body ?? {});
    const workspaceId = await getProjectWorkspaceIdModel(project_id);
    const project = await updateProjectModel({
      projectId: project_id,
      name: payload.name,
      description: payload.description,
      domain: payload.domain,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
      });
    }

    if (workspaceId && req.user?.id) {
      await createAuditLog({
        workspaceId,
        actorUserId: req.user.id,
        action: "project.updated",
        resourceType: "project",
        resourceId: project_id,
        metadata: {
          name: payload.name,
          description: payload.description,
          domain: payload.domain,
        },
      });
    }

    if (payload.domain) await enqueueProjectSnapshot(project.id);

    return res.status(200).json({
      success: true,
      data: project,
    });
  } catch (error) {
    console.error(error);

    let errorMessage = "Something went wrong";

    if (error instanceof ZodError) {
      errorMessage = error.issues[0]?.message ?? "Validation failed";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: errorMessage,
    });
  }
}

const deleteProjectSchema = z.object({
  project_id: z.string({
    error: "Project ID is required",
  }),
});

export async function deleteProject(req: AuthRequest, res: Response) {
  try {
    const { project_id } = deleteProjectSchema.parse(req.params);
    const workspaceId = await getProjectWorkspaceIdModel(project_id);
    const [project] = workspaceId
      ? await getProjectsModel(workspaceId, project_id)
      : [];

    await deleteProjectModel(project_id);

    if (workspaceId && req.user?.id) {
      await createAuditLog({
        workspaceId,
        actorUserId: req.user.id,
        action: "project.deleted",
        resourceType: "project",
        resourceId: project_id,
        metadata: project
          ? {
              name: project.name,
              description: project.description,
              domain: project.domain,
            }
          : undefined,
      });
    }

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    console.error(error);

    let errorMessage = "Something went wrong";

    if (error instanceof ZodError) {
      errorMessage = error.issues[0]?.message ?? "Validation failed";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(400).json({
      success: false,
      message: errorMessage,
    });
  }
}
