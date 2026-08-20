import { Response } from "express";
import { z, ZodError } from "zod";

import {
  acceptWorkspaceNotificationModel,
  getUserNotificationsModel,
  markNotificationReadModel,
} from "../models/workshop.model";
import { AuthRequest } from "../lib/jwt";

const notificationParamsSchema = z.object({
  notification_id: z.string().min(1, "Notification id is required."),
});

function getAuthenticatedUserId(req: AuthRequest): string | null {
  return req.user?.id ?? null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Validation failed.";
  }

  if (error instanceof Error) return error.message;

  return "Something went wrong.";
}

export async function getNotifications(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const notifications = await getUserNotificationsModel(userId);

    return res.status(200).json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function acceptNotification(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { notification_id } = notificationParamsSchema.parse(req.params);
    const result = await acceptWorkspaceNotificationModel({
      notificationId: notification_id,
      userId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(error instanceof ZodError ? 400 : 409).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}

export async function markNotificationRead(req: AuthRequest, res: Response) {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const { notification_id } = notificationParamsSchema.parse(req.params);
    const notification = await markNotificationReadModel({
      notificationId: notification_id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    return res.status(200).json({
      success: true,
      data: { id: notification.id, read: true },
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
}
