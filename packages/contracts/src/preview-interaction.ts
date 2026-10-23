export const PREVIEW_PROTOCOL_VERSION = 1 as const
export const PREVIEW_SCROLL_MESSAGE = 'PATHLENS_SCROLL' as const
export const PREVIEW_MEASURE_REQUEST_MESSAGE =
  'PATHLENS_MEASURE_REQUEST' as const
export const PREVIEW_MEASURE_STATE_MESSAGE = 'PATHLENS_MEASURE_STATE' as const

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
}

export interface PreviewMeasureRequest {
  version: typeof PREVIEW_PROTOCOL_VERSION
  type: typeof PREVIEW_MEASURE_REQUEST_MESSAGE
  sessionId: string
  nonce: string
  requestId: string
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
