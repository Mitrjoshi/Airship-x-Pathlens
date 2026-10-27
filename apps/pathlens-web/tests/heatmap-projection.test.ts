import assert from 'node:assert/strict'
import { test } from 'node:test'
import type {
  HeatmapClickAnchorDefinition,
  HeatmapClickSample,
  PreviewMeasurementState,
} from '@workspace/contracts'
import { projectClickSample } from '../src/components/common/heatmap-projection'

const measurement: PreviewMeasurementState = {
  viewportWidth: 1000,
  viewportHeight: 500,
  documentWidth: 1000,
  documentHeight: 2000,
  scrollX: 0,
  scrollY: 500,
  maxScrollX: 0,
  maxScrollY: 1500,
  layoutVersion: 1,
}

const definition: HeatmapClickAnchorDefinition = {
  anchorId: 'fnv1a32-anchor001',
  positionMode: 'static',
  transformedAncestor: false,
  scrollAncestors: [],
}

test('projects an independently testable element anchor exactly once', () => {
  const sample: HeatmapClickSample = {
    x: 0.5,
    y: 0.5,
    weight: 3,
    coordinateMode: 'document',
    anchorId: definition.anchorId,
    relativeX: 0.25,
    relativeY: 0.5,
  }
  const decision = projectClickSample(
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
        },
      ],
    ])
  )

  assert.deepEqual(decision, {
    projection: { x: 75, y: 20 },
    mode: 'anchored',
  })
})

test('prefers a resolved element anchor over a broader region anchor', () => {
  const sample: HeatmapClickSample = {
    x: 0.5,
    y: 0.5,
    weight: 1,
    coordinateMode: 'document',
    anchorId: definition.anchorId,
    relativeX: 0.5,
    relativeY: 0.5,
    regionAnchor: {
      schemaVersion: 1,
      regionId: 'fnv1a32-region001',
      positionMode: 'static',
      relativeX: 0.9,
      relativeY: 0.9,
      capturedRect: { left: 0, top: 0, width: 1000, height: 1000 },
    },
  }
  const decision = projectClickSample(
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
          rect: { left: 100, top: 20, width: 100, height: 40 },
          positionMode: 'static' as const,
        },
      ],
    ]),
    undefined,
    new Map([
      [
        'fnv1a32-region001',
        {
          regionId: 'fnv1a32-region001',
          status: 'matched' as const,
          rect: { left: 500, top: 100, width: 400, height: 300 },
          positionMode: 'static' as const,
        },
      ],
    ])
  )

  assert.deepEqual(decision, {
    projection: { x: 75, y: 20 },
    mode: 'anchored',
  })
})

test('excludes a region when the structural fingerprint changes', () => {
  const sample: HeatmapClickSample = {
    x: 0.5,
    y: 0.5,
    weight: 1,
    coordinateMode: 'document',
    regionAnchor: {
      schemaVersion: 1,
      regionId: 'fnv1a32-a1b2c3d4',
      regionKind: 'semantic',
      structuralFingerprint: 'html:0/body:0/main:0',
      positionMode: 'static',
      relativeX: 0.5,
      relativeY: 0.5,
      capturedRect: { left: 0, top: 0, width: 800, height: 400 },
    },
  }
  const decision = projectClickSample(
    sample,
    measurement,
    { width: 500, height: 250 },
    new Map(),
    new Map(),
    undefined,
    new Map([
      [
        sample.regionAnchor.regionId,
        {
          regionId: sample.regionAnchor.regionId,
          status: 'matched' as const,
          rect: { left: 0, top: 0, width: 800, height: 400 },
          positionMode: 'static' as const,
          regionKind: 'semantic' as const,
          structuralFingerprint: 'html:0/body:0/main:1',
        },
      ],
    ])
  )

  assert.equal(decision.mode, 'excluded')
  assert.equal(decision.reason, 'region-unresolved')
})
