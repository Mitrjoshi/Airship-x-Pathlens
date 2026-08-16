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
} from "../models/projects.model";

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
