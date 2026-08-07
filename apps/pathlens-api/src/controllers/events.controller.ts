import { Request, Response } from "express";
import {
  createEvents,
  getEventsModel,
  type EventsRange,
} from "../models/events.model";
import { incomingEventsSchema } from "@workspace/contracts/events";
import { z, ZodError } from "zod";

const eventsQuerySchema = z.object({
  workspace_id: z.string().min(1),
  project_id: z.string().min(1),
  range: z.enum(["24h", "7d", "30d", "90d"]).default("24h"),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  page_size: z.coerce.number().int().min(1).max(100).default(50),
});

export async function ingestEvents(req: Request, res: Response) {
  const parsedEvents = incomingEventsSchema.safeParse(req.body);

  if (!parsedEvents.success) {
    return res.status(400).json({
      success: false,
      message:
        parsedEvents.error.issues[0]?.message ?? "Invalid event payload.",
    });
  }

  try {
    await createEvents(parsedEvents.data, req.ip);

    return res.sendStatus(204);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Unable to store analytics events.",
    });
  }
}

export async function getEvents(req: Request, res: Response) {
  try {
    const query = eventsQuerySchema.parse(req.query);
    const eventData = await getEventsModel({
      workspaceId: query.workspace_id,
      projectId: query.project_id,
      range: query.range as EventsRange,
      search: query.search,
      page: query.page,
      pageSize: query.page_size,
    });

    return res.status(200).json({
      success: true,
      data: eventData,
    });
  } catch (error) {
    console.error(error);

    let message = "Unable to load events.";

    if (error instanceof ZodError) {
      message = error.issues[0]?.message ?? "Invalid event filters.";
    }

    return res.status(error instanceof ZodError ? 400 : 500).json({
      success: false,
      message,
    });
  }
}
