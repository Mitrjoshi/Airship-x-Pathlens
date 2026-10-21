import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  isPublicIpAddress,
  PublicUrlError,
  validatePublicHttpUrl,
} from './security.js'

test('allows public IP addresses and blocks private ranges', () => {
  assert.equal(isPublicIpAddress('8.8.8.8'), true)
  assert.equal(isPublicIpAddress('127.0.0.1'), false)
  assert.equal(isPublicIpAddress('10.0.0.1'), false)
  assert.equal(isPublicIpAddress('::1'), false)
  assert.equal(isPublicIpAddress('fd00::1'), false)
})

test('rejects credentials and unsupported URL schemes', async () => {
  await assert.rejects(
    validatePublicHttpUrl('https://user:password@example.com/'),
    PublicUrlError
  )
  await assert.rejects(
    validatePublicHttpUrl('file:///etc/passwd'),
    PublicUrlError
  )
})

test('rejects metadata and local hostnames before DNS resolution', async () => {
  await assert.rejects(
    validatePublicHttpUrl('http://169.254.169.254/latest/meta-data'),
    PublicUrlError
  )
  await assert.rejects(
    validatePublicHttpUrl('http://metadata.google.internal/'),
    PublicUrlError
  )
  await assert.rejects(
    validatePublicHttpUrl('http://localhost/'),
    PublicUrlError
  )
})
