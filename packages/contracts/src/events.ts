import { z } from 'zod'

const optionalText = z.string().max(2048).nullable().optional()
const optionalStack = z.string().max(16384).nullable().optional()
const optionalDimension = z.number().finite().nonnegative().optional()

export const incomingEventSchema = z
  .object({
    projectId: z.string().min(1),
    visitorId: z.string().min(1).max(255),
    sessionId: z.string().min(1).max(255),
    type: z.string().min(1).max(64),
    timestamp: z.union([z.string().min(1), z.number().finite()]),
    url: optionalText,
    path: optionalText,
    title: optionalText,
    referrer: optionalText,
    device: z.string().max(64).nullable().optional(),
    browser: z.string().max(64).nullable().optional(),
    browserVersion: z.string().max(64).nullable().optional(),
    os: z.string().max(64).nullable().optional(),
    osVersion: z.string().max(64).nullable().optional(),
    country: z.string().max(128).nullable().optional(),
    countryCode: z.string().length(2).toUpperCase().nullable().optional(),
    region: z.string().max(128).nullable().optional(),
    city: z.string().max(128).nullable().optional(),
    timezone: z.string().max(128).nullable().optional(),
    language: z.string().max(32).nullable().optional(),
    userAgent: z.string().max(2048).nullable().optional(),
    name: z.string().max(128).nullable().optional(),
    message: optionalText,
    reason: optionalText,
    file: z.string().max(2048).nullable().optional(),
    line: z.number().finite().nonnegative().optional(),
    column: z.number().finite().nonnegative().optional(),
    stack: optionalStack,
    utmSource: z.string().trim().max(512).nullable().optional(),
    utmMedium: z.string().trim().max(512).nullable().optional(),
    utmCampaign: z.string().trim().max(512).nullable().optional(),
    utmTerm: z.string().trim().max(512).nullable().optional(),
    utmContent: z.string().trim().max(512).nullable().optional(),
    screen: z
      .object({
        width: optionalDimension,
        height: optionalDimension,
      })
      .optional(),
    viewport: z
      .object({
        width: optionalDimension,
        height: optionalDimension,
      })
      .optional(),
    document: z
      .object({
        width: optionalDimension,
        height: optionalDimension,
      })
      .optional(),
    duration: z.number().finite().nonnegative().optional(),
    elementKey: z.string().max(256).optional(),
  })
  .passthrough()

export const incomingEventsSchema = z
  .array(incomingEventSchema)
  .min(1, 'At least one event is required.')
  .max(100, 'A maximum of 100 events can be submitted at once.')

export type IncomingEvent = z.infer<typeof incomingEventSchema>
