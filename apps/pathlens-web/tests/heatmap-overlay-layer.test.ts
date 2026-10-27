import assert from 'node:assert/strict'
import { test } from 'node:test'
import type {
  HeatmapClickGroup,
  HeatmapClickSampleGroup,
  HeatmapClickAnchorDefinition,
  HeatmapScrollPoint,
  PreviewMeasurementState,
  PreviewRegionResolution,
} from '@workspace/contracts'
import {
  getClickGroupOverlayDecision,
  getClickOverlayViewport,
  getPreviewViewportForDevice,
  getRepresentativeClickOverlayViewport,
  isClickGroupOverlayCompatible,
  projectClickPoint,
  projectClickSample,
  selectClickAnchorIds,
  getScrollOverlayDecision,
  getScrollGroupOverlayViewport,
  getHeatmapPreviewViewport,
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

function sampleGroup(
  samples: HeatmapClickSampleGroup['samples']
): HeatmapClickSampleGroup {
  return {
    ...group(),
    samples,
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

test('projects anchored samples from live viewport rectangles without reapplying scroll', () => {
  const definition: HeatmapClickAnchorDefinition = {
    anchorId: 'fnv1a32-anchor001',
    positionMode: 'static',
    effectivePositionMode: 'sticky',
    transformedAncestor: false,
    scrollAncestors: [],
  }
  const sample = {
    x: 0.5,
    y: 0.5,
    weight: 1,
    coordinateMode: 'document' as const,
    anchorId: definition.anchorId,
    relativeX: 0.25,
    relativeY: 0.5,
  }
  const result = projectClickSample(
    sample,
    measurement,
    { width: 500, height: 250 },
    new Map([[definition.anchorId, definition]]),
    new Map([
      [
        definition.anchorId,
        {
          anchorId: definition.anchorId,
          status: 'matched' as const,
          rect: { left: 100, top: 20, width: 200, height: 40 },
          positionMode: 'static' as const,
          effectivePositionMode: 'sticky' as const,
        },
      ],
    ])
  )

  assert.deepEqual(result, {
    projection: { x: 75, y: 20 },
    mode: 'anchored',
  })
})

test('prioritizes positioning anchors, then sample count, then anchor ID', () => {
  const definitions = [
    {
      anchorId: 'fnv1a32-normal01',
      positionMode: 'static' as const,
      transformedAncestor: false,
      scrollAncestors: [],
    },
    {
      anchorId: 'fnv1a32-fixed001',
      positionMode: 'static' as const,
      effectivePositionMode: 'fixed' as const,
      transformedAncestor: false,
      scrollAncestors: [],
    },
  ]
  const result = selectClickAnchorIds(
    [
      sampleGroup([
        {
          x: 0.1,
          y: 0.1,
          weight: 1,
          coordinateMode: 'document',
          anchorId: definitions[0]!.anchorId,
          relativeX: 0.5,
          relativeY: 0.5,
        },
        {
          x: 0.2,
          y: 0.2,
          weight: 1,
          coordinateMode: 'document',
          anchorId: definitions[1]!.anchorId,
          relativeX: 0.5,
          relativeY: 0.5,
        },
      ]),
    ],
    definitions,
    { width: 1000, height: 500 }
  )

  assert.deepEqual(result.requestedAnchorIds, [
    definitions[1]!.anchorId,
    definitions[0]!.anchorId,
  ])
})

test('requests anchored samples from compatible document groups across viewports', () => {
  const definition = {
    anchorId: 'fnv1a32-crossview',
    positionMode: 'static' as const,
    transformedAncestor: false,
    scrollAncestors: [],
  }

  const result = selectClickAnchorIds(
    [
      sampleGroup([
        {
          x: 0.2,
          y: 0.2,
          weight: 1,
          coordinateMode: 'document',
          anchorId: definition.anchorId,
          relativeX: 0.5,
          relativeY: 0.5,
        },
      ]),
      sampleGroup([
        {
          x: 0.4,
          y: 0.4,
          weight: 1,
          coordinateMode: 'document',
          anchorId: 'fnv1a32-otherview',
          relativeX: 0.5,
          relativeY: 0.5,
        },
      ]),
    ].map((value, index) =>
      index === 0
        ? value
        : {
            ...value,
            groupId: 'desktop-other-view',
            sourceViewport: { width: 1440, height: 900 },
            sourceDocument: { width: 1440, height: 2600 },
          }
    ),
    [
      definition,
      {
        ...definition,
        anchorId: 'fnv1a32-otherview',
      },
    ],
    { width: 1000, height: 500 }
  )

  assert.deepEqual(result.requestedAnchorIds.sort(), [
    'fnv1a32-crossview',
    'fnv1a32-otherview',
  ])
})

test('excludes unresolved fixed and nested-scroll samples but falls back for normal samples', () => {
  const fixed: HeatmapClickAnchorDefinition = {
    anchorId: 'fnv1a32-fixed001',
    positionMode: 'fixed',
    transformedAncestor: false,
    scrollAncestors: [],
  }
  const normal: HeatmapClickAnchorDefinition = {
    anchorId: 'fnv1a32-normal01',
    positionMode: 'static',
    transformedAncestor: false,
    scrollAncestors: [],
  }
  const fixedSample = {
    x: 0.2,
    y: 0.2,
    weight: 1,
    coordinateMode: 'document' as const,
    anchorId: fixed.anchorId,
    relativeX: 0.5,
    relativeY: 0.5,
  }
  const normalSample = { ...fixedSample, anchorId: normal.anchorId }
  const definitions = new Map([
    [fixed.anchorId, fixed],
    [normal.anchorId, normal],
  ])
  const resolutions = new Map([
    [fixed.anchorId, { anchorId: fixed.anchorId, status: 'missing' as const }],
  ])

  assert.equal(
    projectClickSample(
      fixedSample,
      measurement,
      { width: 500, height: 250 },
      definitions,
      resolutions
    ).mode,
    'excluded'
  )
  assert.equal(
    projectClickSample(
      normalSample,
      measurement,
      { width: 500, height: 250 },
      definitions,
      resolutions
    ).mode,
    'document'
  )
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

test('projects viewport-relative clicks only with matching source viewport geometry', () => {
  const result = projectClickSample(
    {
      x: 0.25,
      y: 0.5,
      weight: 1,
      coordinateMode: 'viewport',
    },
    measurement,
    { width: 500, height: 250 },
    new Map(),
    new Map(),
    { width: 1000, height: 500 }
  )

  assert.deepEqual(result, {
    projection: { x: 125, y: 125 },
    mode: 'document',
  })
})

test('projects explicit region-relative clicks through live region geometry', () => {
  const resolution: PreviewRegionResolution = {
    regionId: 'fnv1a32-a1b2c3d4',
    status: 'matched',
    rect: { left: 100, top: 50, width: 400, height: 200 },
    positionMode: 'static',
  }
  const result = projectClickSample(
    {
      x: 0.9,
      y: 0.9,
      weight: 1,
      coordinateMode: 'document',
      regionAnchor: {
        schemaVersion: 1,
        regionId: resolution.regionId,
        positionMode: 'static',
        relativeX: 0.25,
        relativeY: 0.75,
        capturedRect: { left: 0, top: 0, width: 800, height: 400 },
      },
    },
    measurement,
    { width: 500, height: 250 },
    new Map(),
    new Map(),
    { width: 1000, height: 500 },
    new Map([[resolution.regionId, resolution]])
  )

  assert.deepEqual(result, {
    projection: { x: 100, y: 100 },
    mode: 'region',
  })
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

test('accepts scroll reach across viewport sizes when document geometry matches', () => {
  assert.deepEqual(
    getScrollOverlayDecision(
      {
        viewport: { width: 1920, height: 911 },
        document: { width: 1920, height: 2700 },
      },
      {
        ...measurement,
        viewportWidth: 1280,
        viewportHeight: 720,
        documentWidth: 1920,
        documentHeight: 2700,
      }
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

test('keeps the preview viewport stable when group volumes vary', () => {
  assert.deepEqual(getHeatmapPreviewViewport('desktop'), {
    width: 1280,
    height: 720,
  })
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

test('returns no Scroll preview geometry for empty or non-matching groups', () => {
  assert.equal(getScrollGroupOverlayViewport([], 'desktop'), null)
  assert.equal(
    getScrollGroupOverlayViewport(
      [
        {
          groupId: 'mobile-only',
          device: 'mobile',
          coordinateSchemaVersion: null,
          sourceViewport: { width: 390, height: 844 },
          sourceDocument: { width: 390, height: 1600 },
          sessionCount: 1,
          maximumReachPercent: 0,
          coordinateMode: 'document',
          alignment: 'document-compatible',
          safeForDocumentOverlay: true,
          reachPoints: [{ percentage: 0, count: 1, intensity: 1 }],
        },
      ],
      'desktop'
    ),
    null
  )
})

test('excludes incompatible and unsafe groups independently', () => {
  assert.equal(
    isClickGroupOverlayCompatible(
      group({ sourceViewport: { width: 1440, height: 900 } }),
      measurement
    ),
    true
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
    reason: 'document-height-incompatible',
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
