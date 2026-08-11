import { z } from 'zod'

export const replayEventSchema = z
  .object({
    type: z.number().int(),
    timestamp: z.number().finite(),
  })
  .passthrough()

export type ReplayEvent = z.infer<typeof replayEventSchema>

const replayDimensionSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
})

export const replayChunkSchema = z.object({
  projectId: z.string().min(1),
  sessionId: z.string().min(1).max(255),
  visitorId: z.string().min(1).max(255),
  sequence: z.number().int().nonnegative(),
  events: z.array(replayEventSchema).min(1).max(2_000),
  screen: replayDimensionSchema.optional(),
  viewport: replayDimensionSchema.optional(),
  url: z.string().max(2048).optional(),
  path: z.string().max(2048).optional(),
  isFinal: z.boolean().optional(),
})

export type ReplayChunk = z.infer<typeof replayChunkSchema>
