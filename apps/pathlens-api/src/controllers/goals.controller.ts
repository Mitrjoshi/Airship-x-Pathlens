import { Request, Response } from "express";
import { z, ZodError } from "zod";
import {
  createGoalModel,
  deleteGoalModel,
  getGoalsModel,
  updateGoalModel,
  type GoalRange,
  type GoalType,
} from "../models/goals.model";

const goalPayloadSchema = z
  .object({
    workspace_id: z.string().min(1),
    project_id: z.string().min(1),
    name: z.string().trim().min(1).max(100),
    type: z.enum(["event", "revenue", "pageview", "button", "form_submit"]),
    target: z.coerce.number().finite().positive(),
    unit: z.string().trim().min(1).max(32),
    match_target: z.string().trim().min(1).max(255),
    match_path: z.string().trim().min(1).max(2048).nullable().optional(),
    deadline: z.string().date().nullable().optional(),
  })
  .superRefine((payload, context) => {
    if (payload.type === "button" && !payload.match_path) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["match_path"],
        message: "A page path is required for button goals.",
      });
    }
  });

const goalsQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
});

const goalParamsSchema = z.object({
  goal_id: z.string().min(1),
});

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Validation failed.";
  }

  if (error instanceof Error) return error.message;

  return fallback;
}

function getMatchPath(
  payload: z.infer<typeof goalPayloadSchema>
): string | null {
  return payload.type === "button" ? (payload.match_path ?? null) : null;
}

export async function getGoals(req: Request, res: Response) {
  try {
    const query = goalsQuerySchema.parse(req.query);
    const goals = await getGoalsModel(
      query.workspace_id,
      query.project_id,
      query.range as GoalRange
    );

    return res.status(200).json({
      success: true,
      data: goals,
    });
  } catch (error) {
    console.error(error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error, "Unable to load goals."),
    });
  }
}

export async function createGoal(req: Request, res: Response) {
  try {
    const payload = goalPayloadSchema.parse(req.body);
    const id = await createGoalModel({
      workspaceId: payload.workspace_id,
      projectId: payload.project_id,
      name: payload.name,
      type: payload.type as GoalType,
      target: payload.target,
      unit: payload.unit,
      matchTarget: payload.match_target,
      matchPath: getMatchPath(payload),
      deadline: payload.deadline ?? null,
    });

    return res.status(201).json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error(error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error, "Unable to create goal."),
    });
  }
}

export async function updateGoal(req: Request, res: Response) {
  try {
    const params = goalParamsSchema.parse(req.params);
    const payload = goalPayloadSchema.parse(req.body);
    const updated = await updateGoalModel({
      id: params.goal_id,
      workspaceId: payload.workspace_id,
      projectId: payload.project_id,
      name: payload.name,
      type: payload.type as GoalType,
      target: payload.target,
      unit: payload.unit,
      matchTarget: payload.match_target,
      matchPath: getMatchPath(payload),
      deadline: payload.deadline ?? null,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Goal not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Goal updated.",
    });
  } catch (error) {
    console.error(error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error, "Unable to update goal."),
    });
  }
}

export async function deleteGoal(req: Request, res: Response) {
  try {
    const params = goalParamsSchema.parse(req.params);
    const query = z
      .object({
        workspace_id: z.string().min(1),
        project_id: z.string().min(1),
      })
      .parse(req.query);
    const deleted = await deleteGoalModel({
      id: params.goal_id,
      workspaceId: query.workspace_id,
      projectId: query.project_id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Goal not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Goal deleted.",
    });
  } catch (error) {
    console.error(error);

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error, "Unable to delete goal."),
    });
  }
}
