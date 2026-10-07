import { Response } from "express";
import { z, ZodError } from "zod";

import type { AuthRequest } from "../lib/jwt";
import {
  createProjectDomainModel,
  DefaultProjectDomainDeletionError,
  deleteProjectDomainModel,
  getProjectDomainsModel,
  ProjectDomainDeletionError,
  updateProjectDomainModel,
} from "../models/project-domains.model";

const projectDomainParamsSchema = z.object({
  project_id: z.uuid(),
  domain_id: z.uuid().optional(),
});

const projectDomainBodySchema = z.object({
  domain: z.string().trim().min(1).max(2048),
});

function getErrorMessage(error: unknown) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Validation failed.";
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong.";
}

export async function getProjectDomains(req: AuthRequest, res: Response) {
  try {
    const { project_id } = projectDomainParamsSchema.parse(req.params);
    const domains = await getProjectDomainsModel(project_id);

    return res.status(200).json({ success: true, data: domains });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function createProjectDomain(req: AuthRequest, res: Response) {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { project_id } = projectDomainParamsSchema.parse(req.params);
    const { domain } = projectDomainBodySchema.parse(req.body);
    const projectDomain = await createProjectDomainModel({
      projectId: project_id,
      userId,
      domain,
    });

    return res.status(201).json({ success: true, data: projectDomain });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function updateProjectDomain(req: AuthRequest, res: Response) {
  try {
    const { project_id, domain_id } = projectDomainParamsSchema.parse(
      req.params
    );
    const { domain } = projectDomainBodySchema.parse(req.body);
    const projectDomain = await updateProjectDomainModel({
      projectId: project_id,
      domainId: domain_id!,
      domain,
    });

    if (!projectDomain) {
      return res.status(404).json({
        success: false,
        message: "Project domain not found.",
      });
    }

    return res.status(200).json({ success: true, data: projectDomain });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function deleteProjectDomain(req: AuthRequest, res: Response) {
  try {
    const { project_id, domain_id } = projectDomainParamsSchema.parse(
      req.params
    );
    const projectDomain = await deleteProjectDomainModel({
      projectId: project_id,
      domainId: domain_id!,
    });

    if (!projectDomain) {
      return res.status(404).json({
        success: false,
        message: "Project domain not found.",
      });
    }

    return res.status(200).json({ success: true, data: projectDomain });
  } catch (error) {
    return res
      .status(
        error instanceof ZodError
          ? 400
          : error instanceof ProjectDomainDeletionError ||
              error instanceof DefaultProjectDomainDeletionError
            ? 409
            : 500
      )
      .json({
        success: false,
        message: getErrorMessage(error),
      });
  }
}
