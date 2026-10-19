import { db } from "../db/client";
import { feedback } from "../db/schema";
import { eq } from "drizzle-orm";

export async function hasFeedbackModel(userId: string) {
  const [entry] = await db
    .select({ id: feedback.id })
    .from(feedback)
    .where(eq(feedback.userId, userId))
    .limit(1);

  return Boolean(entry);
}

export async function createFeedbackModel(data: {
  userId: string;
  message: string;
  pageUrl?: string;
}) {
  const [entry] = await db
    .insert(feedback)
    .values({
      userId: data.userId,
      message: data.message,
      pageUrl: data.pageUrl,
    })
    .returning({
      id: feedback.id,
      createdAt: feedback.createdAt,
    });

  return entry;
}
