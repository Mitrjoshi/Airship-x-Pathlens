import type { FeedbackCategory } from "@workspace/contracts";

import { db } from "../db/client";
import { feedback } from "../db/schema";

export async function createFeedbackModel(data: {
  userId: string;
  category: FeedbackCategory;
  message: string;
  pageUrl?: string;
  workspaceId?: string;
  projectId?: string;
}) {
  const [entry] = await db
    .insert(feedback)
    .values({
      userId: data.userId,
      category: data.category,
      message: data.message,
      pageUrl: data.pageUrl,
      workspaceId: data.workspaceId,
      projectId: data.projectId,
    })
    .returning({
      id: feedback.id,
      category: feedback.category,
      createdAt: feedback.createdAt,
    });

  return entry;
}
