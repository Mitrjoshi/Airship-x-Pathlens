import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getTouchScrollDelta,
  normalizeWheelDelta,
} from '../src/components/common/live-preview-input'

test('normalizes pixel wheel deltas without changing them', () => {
  assert.equal(normalizeWheelDelta(120, 0, 20, 800), 120)
})

test('normalizes line and page wheel deltas', () => {
  assert.equal(normalizeWheelDelta(3, 1, 18, 800), 54)
  assert.equal(normalizeWheelDelta(1, 2, 800, 720), 720)
})

test('falls back to a reasonable line height', () => {
  assert.equal(normalizeWheelDelta(2, 1, Number.NaN, 800), 32)
})

test('calculates touch movement from the previous coordinate', () => {
  assert.equal(getTouchScrollDelta(240, 180), 60)
  assert.equal(getTouchScrollDelta(180, 240), -60)
})
