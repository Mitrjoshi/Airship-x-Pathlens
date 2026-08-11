import { z } from 'zod'

export const feedbackCategorySchema = z.enum(['bug', 'tracking', 'idea'])

export const createFeedbackSchema = z.object({
  category: feedbackCategorySchema,
  message: z
    .string()
    .trim()
    .min(10, 'Feedback must be at least 10 characters.')
    .max(2000, 'Feedback must be 2000 characters or fewer.'),
  page_url: z.url().max(2048).optional(),
  workspace_id: z.uuid().optional(),
  project_id: z.uuid().optional(),
})

export type FeedbackCategory = z.infer<typeof feedbackCategorySchema>
export type CreateFeedbackPayload = z.infer<typeof createFeedbackSchema>
