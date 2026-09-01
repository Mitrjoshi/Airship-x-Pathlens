import { Request, Response } from "express";
import { z, ZodError } from "zod";
import { generateApiKey } from "../utils/utils";
import {
  createProjectModel,
  deleteProjectModel,
  getEmptyProjectSnapshot,
  getProjectsModel,
  getProjectSnapshotsModel,
  getProjectStatsModel,
  updateProjectModel,
} from "../models/projects.model";
import { enqueueProjectSnapshot } from "../lib/snapshot-queue";

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

export async function createProject(req: Request, res: Response) {
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

    const api_key = generateApiKey();

    const project = await createProjectModel({
      name,
      description,
      api_key,
      domain,
      capture_replay: captureReplay,
      capture_performance: capturePerformance,
      capture_errors: captureErrors,
      workspace_id,
    });

    const projectId = project[0].id;

    if (domain) await enqueueProjectSnapshot(projectId);

    res.status(200).send({
      success: true,
      data: {
        id: projectId,
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

    return res.status(400).json({
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
  captureReplay: z.boolean(),
  capturePerformance: z.boolean(),
  captureErrors: z.boolean(),
});

export async function getProjects(req: Request, res: Response) {
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

export async function updateProject(req: Request, res: Response) {
  try {
    const { project_id } = updateProjectParamsSchema.parse(req.params);
    const payload = updateProjectSchema.parse(req.body ?? {});
    const project = await updateProjectModel({
      projectId: project_id,
      name: payload.name,
      description: payload.description,
      domain: payload.domain,
      captureReplay: payload.captureReplay,
      capturePerformance: payload.capturePerformance,
      captureErrors: payload.captureErrors,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found.",
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

export async function deleteProject(req: Request, res: Response) {
  try {
    const { project_id } = deleteProjectSchema.parse(req.params);

    await deleteProjectModel(project_id);

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
