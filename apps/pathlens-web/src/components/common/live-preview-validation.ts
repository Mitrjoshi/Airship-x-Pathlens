import type { PreviewMeasurementState } from '@workspace/contracts'

export function isCurrentPreviewMessage(
  message: Pick<PreviewMeasurementState, 'layoutVersion'> & {
    sessionId: string
    nonce: string
    requestId: string
  },
  expected: {
    sessionId: string
    nonce: string
    requestId: string
    lastLayoutVersion: number
  }
): boolean {
  return (
    message.sessionId === expected.sessionId &&
    message.nonce === expected.nonce &&
    message.requestId === expected.requestId &&
    message.layoutVersion > expected.lastLayoutVersion
  )
}
