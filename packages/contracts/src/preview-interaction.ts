import type {
  ClickElementPositionMode,
  ClickElementRect,
} from './element-anchor'
import {
  MAX_CLICK_ELEMENT_ANCHOR_DEPTH,
  MAX_CLICK_ELEMENT_ANCHOR_DIMENSION,
  MAX_CLICK_ELEMENT_ANCHOR_ID_LENGTH,
} from './element-anchor'

export const PREVIEW_PROTOCOL_VERSION = 1 as const
export const PREVIEW_SCROLL_MESSAGE = 'PATHLENS_SCROLL' as const
export const PREVIEW_MEASURE_REQUEST_MESSAGE =
  'PATHLENS_MEASURE_REQUEST' as const
export const PREVIEW_MEASURE_STATE_MESSAGE = 'PATHLENS_MEASURE_STATE' as const
export const MAX_PREVIEW_ANCHOR_IDS = 256
export const MAX_PREVIEW_ANCHOR_ID_LENGTH = 64
export const MAX_PREVIEW_ANCHOR_RESPONSE_BYTES = 256 * 1024

export type PreviewAnchorResolutionStatus = 'matched' | 'missing' | 'ambiguous'

export interface PreviewAnchorResolution {
  anchorId: string
  status: PreviewAnchorResolutionStatus
  rect?: ClickElementRect
  positionMode?: ClickElementPositionMode
  effectivePositionMode?: ClickElementPositionMode
  positioningAncestorDepth?: number
  positioningAncestorAnchorId?: string
}

export interface PreviewMeasurementState {
  viewportWidth: number
  viewportHeight: number
  documentWidth: number
  documentHeight: number
  scrollX: number
  scrollY: number
  maxScrollX: number
  maxScrollY: number
  layoutVersion: number
  anchorResolutions?: PreviewAnchorResolution[]
}

export interface PreviewMeasureRequest {
  version: typeof PREVIEW_PROTOCOL_VERSION
  type: typeof PREVIEW_MEASURE_REQUEST_MESSAGE
  sessionId: string
  nonce: string
  requestId: string
  anchorIds?: string[]
}

export interface PreviewMeasureStateMessage extends PreviewMeasurementState {
  version: typeof PREVIEW_PROTOCOL_VERSION
  type: typeof PREVIEW_MEASURE_STATE_MESSAGE
  sessionId: string
  nonce: string
  requestId: string
}

export interface PreviewScrollMessage {
  version: typeof PREVIEW_PROTOCOL_VERSION
  type: typeof PREVIEW_SCROLL_MESSAGE
  sessionId: string
  nonce: string
  delta: number
}

export function isPreviewAnchorId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_PREVIEW_ANCHOR_ID_LENGTH &&
    value.length <= MAX_CLICK_ELEMENT_ANCHOR_ID_LENGTH &&
    /^fnv1a32-[0-9a-f]{8}$/.test(value)
  )
}

function isPositionMode(value: unknown): value is ClickElementPositionMode {
  return (
    value === 'static' ||
    value === 'absolute' ||
    value === 'fixed' ||
    value === 'sticky'
  )
}

function isAnchorRect(value: unknown): value is ClickElementRect {
  if (!value || typeof value !== 'object') return false

  const rect = value as Record<string, unknown>
  return (
    typeof rect.left === 'number' &&
    Number.isFinite(rect.left) &&
    typeof rect.top === 'number' &&
    Number.isFinite(rect.top) &&
    typeof rect.width === 'number' &&
    Number.isFinite(rect.width) &&
    rect.width > 0 &&
    rect.width <= MAX_CLICK_ELEMENT_ANCHOR_DIMENSION &&
    typeof rect.height === 'number' &&
    Number.isFinite(rect.height) &&
    rect.height > 0 &&
    rect.height <= MAX_CLICK_ELEMENT_ANCHOR_DIMENSION
  )
}

function isPreviewAnchorResolution(
  value: unknown
): value is PreviewAnchorResolution {
  if (!value || typeof value !== 'object') return false

  const resolution = value as Record<string, unknown>
  const allowedKeys = new Set([
    'anchorId',
    'status',
    'rect',
    'positionMode',
    'effectivePositionMode',
    'positioningAncestorDepth',
    'positioningAncestorAnchorId',
  ])
  if (
    Object.keys(resolution).some((key) => !allowedKeys.has(key)) ||
    !isPreviewAnchorId(resolution.anchorId) ||
    (resolution.status !== 'matched' &&
      resolution.status !== 'missing' &&
      resolution.status !== 'ambiguous')
  ) {
    return false
  }

  if (
    resolution.status === 'matched' &&
    (!isAnchorRect(resolution.rect) || !isPositionMode(resolution.positionMode))
  ) {
    return false
  }

  if (
    resolution.positionMode !== undefined &&
    !isPositionMode(resolution.positionMode)
  ) {
    return false
  }
  if (
    resolution.effectivePositionMode !== undefined &&
    !isPositionMode(resolution.effectivePositionMode)
  ) {
    return false
  }
  if (resolution.positioningAncestorDepth !== undefined) {
    const depth = resolution.positioningAncestorDepth
    if (
      typeof depth !== 'number' ||
      !Number.isInteger(depth) ||
      depth < 1 ||
      depth > MAX_CLICK_ELEMENT_ANCHOR_DEPTH
    ) {
      return false
    }
  }
  if (
    resolution.positioningAncestorAnchorId !== undefined &&
    !isPreviewAnchorId(resolution.positioningAncestorAnchorId)
  ) {
    return false
  }

  return true
}

export function isPreviewMeasureStateMessage(
  value: unknown
): value is PreviewMeasureStateMessage {
  if (!value || typeof value !== 'object') return false

  const message = value as Record<string, unknown>
  if (
    message.version !== PREVIEW_PROTOCOL_VERSION ||
    message.type !== PREVIEW_MEASURE_STATE_MESSAGE ||
    typeof message.sessionId !== 'string' ||
    typeof message.nonce !== 'string' ||
    typeof message.requestId !== 'string'
  ) {
    return false
  }

  if (message.anchorResolutions !== undefined) {
    let serializedResolutions: string
    try {
      serializedResolutions = JSON.stringify(message.anchorResolutions)
    } catch {
      return false
    }

    if (
      !Array.isArray(message.anchorResolutions) ||
      message.anchorResolutions.length > MAX_PREVIEW_ANCHOR_IDS ||
      new Set(
        message.anchorResolutions.map((resolution) =>
          resolution && typeof resolution === 'object'
            ? (resolution as Record<string, unknown>).anchorId
            : undefined
        )
      ).size !== message.anchorResolutions.length ||
      !message.anchorResolutions.every(isPreviewAnchorResolution) ||
      serializedResolutions.length > MAX_PREVIEW_ANCHOR_RESPONSE_BYTES
    ) {
      return false
    }
  }

  const numericFields = [
    'viewportWidth',
    'viewportHeight',
    'documentWidth',
    'documentHeight',
    'scrollX',
    'scrollY',
    'maxScrollX',
    'maxScrollY',
    'layoutVersion',
  ]

  return numericFields.every((field) => {
    const number = message[field]
    return typeof number === 'number' && Number.isFinite(number)
  })
}
