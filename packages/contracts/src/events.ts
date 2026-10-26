import { z } from 'zod'
import {
  CLICK_ELEMENT_ANCHOR_SCHEMA_VERSION,
  MAX_CLICK_ELEMENT_ANCHOR_BYTES,
  MAX_CLICK_ELEMENT_ANCHOR_DEPTH,
  MAX_CLICK_ELEMENT_ANCHOR_DIMENSION,
  MAX_CLICK_ELEMENT_ANCHOR_ID_LENGTH,
  MAX_CLICK_ELEMENT_SCROLL_ANCESTORS,
} from './element-anchor'

const optionalText = z.string().max(2048).nullable().optional()
const optionalStack = z.string().max(16384).nullable().optional()
const optionalDimension = z.number().finite().nonnegative().optional()
const clickElementRectSchema = z.object({
  left: z.number().finite(),
  top: z.number().finite(),
  width: z.number().finite().positive().max(MAX_CLICK_ELEMENT_ANCHOR_DIMENSION),
  height: z
    .number()
    .finite()
    .positive()
    .max(MAX_CLICK_ELEMENT_ANCHOR_DIMENSION),
})
// Anchor metadata is strict by design: malformed incoming anchors are rejected
// instead of being persisted as arbitrary selector or DOM data.
export const clickElementAnchorSchema = z
  .object({
    schemaVersion: z.literal(CLICK_ELEMENT_ANCHOR_SCHEMA_VERSION),
    anchorId: z.string().min(1).max(MAX_CLICK_ELEMENT_ANCHOR_ID_LENGTH),
    positionMode: z.enum(['static', 'absolute', 'fixed', 'sticky']),
    effectivePositionMode: z
      .enum(['static', 'absolute', 'fixed', 'sticky'])
      .optional(),
    positioningAncestorDepth: z
      .number()
      .int()
      .min(1)
      .max(MAX_CLICK_ELEMENT_ANCHOR_DEPTH)
      .optional(),
    positioningAncestorAnchorId: z
      .string()
      .min(1)
      .max(MAX_CLICK_ELEMENT_ANCHOR_ID_LENGTH)
      .optional(),
    relativeX: z.number().finite().min(0).max(1),
    relativeY: z.number().finite().min(0).max(1),
    capturedRect: clickElementRectSchema,
    transformedAncestor: z.boolean(),
    stickyInset: z
      .object({
        top: z.number().finite().optional(),
        right: z.number().finite().optional(),
        bottom: z.number().finite().optional(),
        left: z.number().finite().optional(),
      })
      .strict()
      .optional(),
    scrollAncestors: z
      .array(
        z.object({
          anchorId: z.string().min(1).max(MAX_CLICK_ELEMENT_ANCHOR_ID_LENGTH),
          scrollLeft: z.number().finite(),
          scrollTop: z.number().finite(),
          maxScrollLeft: z
            .number()
            .finite()
            .nonnegative()
            .max(MAX_CLICK_ELEMENT_ANCHOR_DIMENSION),
          maxScrollTop: z
            .number()
            .finite()
            .nonnegative()
            .max(MAX_CLICK_ELEMENT_ANCHOR_DIMENSION),
        })
      )
      .max(MAX_CLICK_ELEMENT_SCROLL_ANCESTORS),
  })
  .strict()
  .superRefine((value, context) => {
    if (JSON.stringify(value).length > MAX_CLICK_ELEMENT_ANCHOR_BYTES) {
      context.addIssue({
        code: 'custom',
        message: 'Click element anchor metadata is too large.',
      })
    }
  })

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
    faviconUrl: optionalText,
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
    coordinateSchemaVersion: z.number().int().positive().optional(),
    devicePixelRatio: optionalDimension,
    duration: z.number().finite().nonnegative().optional(),
    elementKey: z.string().max(256).optional(),
    elementAnchor: clickElementAnchorSchema.optional(),
  })
  .passthrough()

export const incomingEventsSchema = z
  .array(incomingEventSchema)
  .min(1, 'At least one event is required.')
  .max(100, 'A maximum of 100 events can be submitted at once.')

export type IncomingEvent = z.infer<typeof incomingEventSchema>
