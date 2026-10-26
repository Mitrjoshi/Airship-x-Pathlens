import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizePublicBasePath } from './config.js'

test('normalizes the optional public base path exactly once', () => {
  assert.equal(normalizePublicBasePath(undefined), '')
  assert.equal(normalizePublicBasePath('/dev'), '/dev')
  assert.equal(normalizePublicBasePath('/dev/'), '/dev')
  assert.throws(() => normalizePublicBasePath('dev'))
  assert.throws(() => normalizePublicBasePath('/dev//'))
  assert.throws(() => normalizePublicBasePath('/dev?stage=1'))
})
