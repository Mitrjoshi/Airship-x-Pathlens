import assert from 'node:assert/strict'
import test from 'node:test'
import { isBlockedPreviewTrackingUrl } from './tracking-policy.js'

test('blocks the published Pathlens tracker and collection endpoints', () => {
  assert.equal(
    isBlockedPreviewTrackingUrl(
      'https://pathlens-tracker.s3.ap-south-1.amazonaws.com/tracker.global.js'
    ),
    true
  )
  assert.equal(
    isBlockedPreviewTrackingUrl(
      'https://t1xg2ok5i0.execute-api.ap-south-1.amazonaws.com/dev/api/events'
    ),
    true
  )
  assert.equal(
    isBlockedPreviewTrackingUrl(
      'https://t1xg2ok5i0.execute-api.ap-south-1.amazonaws.com/dev/api/replay/chunks'
    ),
    true
  )
  assert.equal(
    isBlockedPreviewTrackingUrl('https://example.com/assets/app.js'),
    false
  )
})
