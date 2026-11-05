import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isCurrentPreviewMessage } from '../src/components/common/live-preview-validation'

const expected = {
  sessionId: 'session-1',
  nonce: 'nonce-1',
  requestId: 'request-1',
  lastLayoutVersion: 4,
}

test('accepts only a newer measurement from the active preview request', () => {
  assert.equal(
    isCurrentPreviewMessage({ ...expected, layoutVersion: 5 }, expected),
    true
  )
})

test('rejects stale, mismatched, and replayed preview messages', () => {
  assert.equal(
    isCurrentPreviewMessage({ ...expected, layoutVersion: 4 }, expected),
    false
  )
  assert.equal(
    isCurrentPreviewMessage(
      { ...expected, sessionId: 'old-session', layoutVersion: 5 },
      expected
    ),
    false
  )
  assert.equal(
    isCurrentPreviewMessage(
      { ...expected, requestId: 'old-request', layoutVersion: 5 },
      expected
    ),
    false
  )
})
