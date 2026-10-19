import { z } from 'zod'

export const createFeedbackSchema = z.object({
  message: z
    .string()
    .trim()
    .min(10, 'Feedback must be at least 10 characters.')
    .max(2000, 'Feedback must be 2000 characters or fewer.'),
  page_url: z.url().max(2048).optional(),
})

export type CreateFeedbackPayload = z.infer<typeof createFeedbackSchema>
