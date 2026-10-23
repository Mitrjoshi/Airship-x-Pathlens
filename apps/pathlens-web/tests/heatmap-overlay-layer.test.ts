import assert from 'node:assert/strict'
import { test } from 'node:test'
import type {
  HeatmapClickGroup,
  HeatmapScrollPoint,
  PreviewMeasurementState,
} from '@workspace/contracts'
import {
  getClickGroupOverlayDecision,
  getClickOverlayViewport,
  getPreviewViewportForDevice,
  getRepresentativeClickOverlayViewport,
  isClickGroupOverlayCompatible,
  projectClickPoint,
  getScrollOverlayDecision,
  getScrollGroupOverlayViewport,
  getSnapshotScrollOverlayDimensions,
  getSharedOverlayDimensions,
  projectScrollDepth,
} from '../src/components/common/heatmap-overlay-layer'

const measurement: PreviewMeasurementState = {
  viewportWidth: 1000,
  viewportHeight: 500,
  documentWidth: 1000,
  documentHeight: 2000,
  scrollX: 100,
  scrollY: 500,
  maxScrollX: 100,
  maxScrollY: 1500,
  layoutVersion: 3,
}

function group(overrides: Partial<HeatmapClickGroup> = {}): HeatmapClickGroup {
  return {
    groupId: 'desktop-1000',
    coordinateSchemaVersion: 1,
    coordinateMode: 'document',
    sourceViewport: { width: 1000, height: 500 },
    sourceDocument: { width: 1000, height: 2000 },
    sampleCount: 1,
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    points: [],
    ...overrides,
  }
}

test('projects normalized document coordinates through scroll and CSS scale', () => {
  const projection = projectClickPoint(
    { x: 0.5, y: 0.5, coordinateMode: 'document' },
    measurement,
    { width: 500, height: 250 }
  )

  assert.deepEqual(projection, { x: 200, y: 250 })
})

test('projects horizontal scroll without applying device pixel ratio', () => {
  const projection = projectClickPoint(
    { x: 0.2, y: 0.25, coordinateMode: 'document' },
    { ...measurement, scrollX: 50, scrollY: 0 },
    { width: 500, height: 250 }
  )

  assert.deepEqual(projection, { x: 75, y: 250 })
})

test('keeps fractional visual scaling in CSS-pixel projection coordinates', () => {
  const projection = projectClickPoint(
    { x: 0.225, y: 0.175, coordinateMode: 'document' },
    {
      ...measurement,
      viewportWidth: 1920,
      viewportHeight: 911,
      documentWidth: 1920,
      documentHeight: 2700,
      scrollX: 0,
      scrollY: 0,
    },
    { width: 837, height: 397.5 }
  )

  assert.ok(projection)
  assert.ok(Math.abs(projection.x - 188.325) < 0.000001)
  assert.ok(Math.abs(projection.y - 206.1676728869374) < 0.000001)
})

test('rejects invalid or viewport-relative click points', () => {
  assert.equal(
    projectClickPoint(
      { x: 1.1, y: 0.5, coordinateMode: 'document' },
      measurement,
      { width: 500, height: 250 }
    ),
    null
  )
  assert.equal(
    projectClickPoint(
      { x: 0.5, y: 0.5, coordinateMode: 'viewport' },
      measurement,
      { width: 500, height: 250 }
    ),
    null
  )
})

test('projects scroll reach percentages from the tracked scrollable distance', () => {
  const point = (percentage: number): HeatmapScrollPoint => ({
    percentage,
    count: 1,
    intensity: 1,
  })
  assert.deepEqual(
    projectScrollDepth(point(0), measurement, { width: 500, height: 250 }),
    { x: 0, y: -250 }
  )
  assert.deepEqual(
    projectScrollDepth(point(50), measurement, { width: 500, height: 250 }),
    { x: 0, y: 125 }
  )
  assert.deepEqual(
    projectScrollDepth(point(100), measurement, { width: 500, height: 250 }),
    { x: 0, y: 500 }
  )
  assert.equal(
    projectScrollDepth(point(101), measurement, { width: 500, height: 250 }),
    null
  )
})

test('requires scroll source dimensions before accepting scroll overlay data', () => {
  assert.deepEqual(getScrollOverlayDecision(null, measurement), {
    compatible: false,
    reason: 'source-dimensions-unavailable',
  })
  assert.deepEqual(
    getScrollOverlayDecision(
      {
        viewport: { width: 1000, height: 500 },
        document: { width: 1000, height: 2000 },
      },
      measurement
    ),
    { compatible: true, reason: 'compatible' }
  )
})

test('uses snapshot viewport dimensions for same-device scroll source geometry', () => {
  assert.deepEqual(
    getSnapshotScrollOverlayDimensions(
      {
        id: 'snapshot',
        pathname: '/privacy',
        domain: 'example.com',
        device: 'desktop',
        viewportWidth: 1920,
        viewportHeight: 911,
        pageWidth: 1920,
        pageHeight: 2700,
        deviceScaleFactor: 1,
        capturedAt: null,
      },
      'desktop'
    ),
    {
      viewport: { width: 1920, height: 911 },
      document: { width: 1920, height: 2700 },
      provenance: 'snapshot',
    }
  )
  assert.equal(
    getSnapshotScrollOverlayDimensions(
      {
        id: 'snapshot',
        pathname: '/privacy',
        domain: 'example.com',
        device: 'desktop',
        viewportWidth: 1920,
        viewportHeight: 911,
        pageWidth: 1920,
        pageHeight: 2700,
        deviceScaleFactor: 1,
        capturedAt: null,
      },
      'mobile'
    ),
    null
  )
  assert.equal(
    getSnapshotScrollOverlayDimensions(
      {
        id: 'snapshot',
        pathname: '/privacy',
        domain: 'example.com',
        device: 'desktop',
        viewportWidth: 1920,
        viewportHeight: 911,
        pageWidth: null,
        pageHeight: null,
        deviceScaleFactor: 1,
        capturedAt: null,
      },
      'desktop'
    ),
    null
  )
})

test('does not use mixed tracker layouts as one Scroll source', () => {
  assert.equal(
    getSharedOverlayDimensions([
      group({
        sourceViewport: { width: 1920, height: 911 },
        sourceDocument: { width: 1920, height: 2700 },
      }),
      group({
        groupId: 'mobile-layout',
        sourceViewport: { width: 390, height: 844 },
        sourceDocument: { width: 390, height: 1600 },
      }),
    ]),
    null
  )
})

test('accepts matching dimensions within conservative tolerance', () => {
  assert.equal(
    isClickGroupOverlayCompatible(
      group({
        sourceViewport: { width: 1080, height: 540 },
        sourceDocument: { width: 1080, height: 2200 },
      }),
      measurement
    ),
    true
  )
})

test('rejects recorded document heights outside the existing geometry tolerance', () => {
  assert.deepEqual(
    getClickGroupOverlayDecision(
      group({ sourceDocument: { width: 1000, height: 2300 } }),
      measurement
    ),
    { compatible: false, reason: 'document-height-incompatible' }
  )
  assert.equal(
    isClickGroupOverlayCompatible(
      group({ sourceDocument: { width: 1000, height: 2150 } }),
      measurement
    ),
    true
  )
})

test('selects one shared source viewport for a virtual preview stage', () => {
  assert.deepEqual(
    getClickOverlayViewport([
      group({
        sourceViewport: { width: 1920, height: 911 },
        sourceDocument: { width: 1920, height: 2700 },
      }),
    ]),
    { width: 1920, height: 911 }
  )
  assert.equal(
    getClickOverlayViewport([
      group({ sourceViewport: { width: 1920, height: 911 } }),
      group({
        groupId: 'mobile',
        sourceViewport: { width: 390, height: 844 },
      }),
    ]),
    null
  )
})

test('selects recorded viewports by device and falls back without crossing devices', () => {
  const desktop = group({
    sourceViewport: { width: 1920, height: 911 },
    sourceDocument: { width: 1920, height: 2700 },
  })
  const mobile = group({
    groupId: 'mobile',
    sourceViewport: { width: 390, height: 844 },
    sourceDocument: { width: 390, height: 1600 },
  })

  assert.deepEqual(getPreviewViewportForDevice([desktop, mobile], 'mobile'), {
    width: 390,
    height: 844,
  })
  assert.deepEqual(getPreviewViewportForDevice([desktop], 'mobile'), {
    width: 390,
    height: 844,
  })
  assert.deepEqual(getPreviewViewportForDevice([desktop], 'desktop'), {
    width: 1920,
    height: 911,
  })
})

test('selects the highest-volume compatible Click geometry', () => {
  assert.deepEqual(
    getRepresentativeClickOverlayViewport(
      [
        group({
          sampleCount: 1,
          sourceViewport: { width: 1440, height: 900 },
          sourceDocument: { width: 1440, height: 3000 },
        }),
        group({
          groupId: 'desktop-wide',
          sampleCount: 4,
          sourceViewport: { width: 1920, height: 911 },
          sourceDocument: { width: 1920, height: 2700 },
        }),
      ],
      'desktop'
    ),
    { width: 1920, height: 911 }
  )
})

test('selects one Scroll preview geometry and leaves other geometries to compatibility filtering', () => {
  assert.deepEqual(
    getScrollGroupOverlayViewport(
      [
        {
          groupId: 'desktop-wide',
          device: 'desktop',
          coordinateSchemaVersion: 1,
          sourceViewport: { width: 1920, height: 911 },
          sourceDocument: { width: 1920, height: 2700 },
          sessionCount: 2,
          maximumReachPercent: 100,
          coordinateMode: 'document',
          alignment: 'document-compatible',
          safeForDocumentOverlay: true,
          reachPoints: [],
        },
        {
          groupId: 'desktop-narrow',
          device: 'desktop',
          coordinateSchemaVersion: 1,
          sourceViewport: { width: 1440, height: 900 },
          sourceDocument: { width: 1440, height: 3000 },
          sessionCount: 1,
          maximumReachPercent: 50,
          coordinateMode: 'document',
          alignment: 'document-compatible',
          safeForDocumentOverlay: true,
          reachPoints: [],
        },
      ],
      'desktop'
    ),
    { width: 1920, height: 911 }
  )
})

test('excludes incompatible and unsafe groups independently', () => {
  assert.equal(
    isClickGroupOverlayCompatible(
      group({ sourceViewport: { width: 1440, height: 900 } }),
      measurement
    ),
    false
  )
  assert.equal(
    isClickGroupOverlayCompatible(
      group({ safeForDocumentOverlay: false }),
      measurement
    ),
    false
  )
  assert.equal(
    isClickGroupOverlayCompatible(
      group({ alignment: 'viewport-only' }),
      measurement
    ),
    false
  )
})

test('reports a constrained iframe viewport without accepting a mismatched group', () => {
  const decision = getClickGroupOverlayDecision(
    group({
      sourceViewport: { width: 1272, height: 911 },
      sourceDocument: { width: 1272, height: 2988 },
    }),
    {
      ...measurement,
      viewportWidth: 1120,
      viewportHeight: 746,
      documentWidth: 1120,
      documentHeight: 2600,
    }
  )

  assert.deepEqual(decision, {
    compatible: false,
    reason: 'viewport-dimensions-incompatible',
  })
})

test('requires an authoritative measurement before rendering', () => {
  assert.equal(isClickGroupOverlayCompatible(group(), null), false)
  assert.equal(
    isClickGroupOverlayCompatible(group({ sourceDocument: null }), measurement),
    false
  )
})

test('rejects missing and invalid recorded document heights without inventing geometry', () => {
  assert.deepEqual(
    getClickGroupOverlayDecision(group({ sourceDocument: null }), measurement),
    { compatible: false, reason: 'source-document-invalid' }
  )
  assert.deepEqual(
    getClickGroupOverlayDecision(
      group({ sourceDocument: { width: 1000, height: 0 } }),
      measurement
    ),
    { compatible: false, reason: 'source-document-invalid' }
  )
})
