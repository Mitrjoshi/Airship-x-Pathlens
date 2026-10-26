import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import { HeatmapOverlayLayer } from '../src/components/common/heatmap-overlay-layer'
import { HeatmapCompletenessWarning } from '../src/components/common/heatmap-completeness-warning'
import '../src/index.css'
import type {
  HeatmapClickGroup,
  HeatmapClickAnchorDefinition,
  HeatmapClickSampleGroup,
  HeatmapMovementGroup,
  HeatmapScrollGroup,
  HeatmapScrollPoint,
  PreviewMeasurementState,
  PreviewAnchorResolution,
} from '@workspace/contracts'

const baseMeasurement: PreviewMeasurementState = {
  viewportWidth: 1920,
  viewportHeight: 911,
  documentWidth: 1920,
  documentHeight: 2700,
  scrollX: 0,
  scrollY: 0,
  maxScrollX: 0,
  maxScrollY: 1789,
  layoutVersion: 1,
}

const fixtureAnchorId = 'fnv1a32-fixture01'
const fixtureAnchorDefinitions: HeatmapClickAnchorDefinition[] = [
  {
    anchorId: fixtureAnchorId,
    positionMode: 'static',
    transformedAncestor: false,
    scrollAncestors: [],
  },
]
const fixtureAnchorResolutions: PreviewAnchorResolution[] = [
  {
    anchorId: fixtureAnchorId,
    status: 'matched',
    rect: { left: 300, top: 180, width: 120, height: 44 },
    positionMode: 'static',
  },
]

const clickGroups: HeatmapClickGroup[] = [
  {
    groupId: 'desktop-1920',
    coordinateSchemaVersion: 1,
    coordinateMode: 'document',
    sourceViewport: { width: 1920, height: 911 },
    sourceDocument: { width: 1920, height: 2700 },
    sampleCount: 4,
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    points: [
      {
        x: 0.225,
        y: 0.175,
        count: 3,
        intensity: 0.75,
        coordinateMode: 'document',
      },
      {
        x: 0.275,
        y: 0.175,
        count: 2,
        intensity: 0.5,
        coordinateMode: 'document',
      },
      {
        x: 0.175,
        y: 0.075,
        count: 3,
        intensity: 0.75,
        coordinateMode: 'document',
      },
      {
        x: 0.175,
        y: 0.675,
        count: 3,
        intensity: 0.75,
        coordinateMode: 'document',
      },
    ],
  },
  {
    groupId: 'mobile-390',
    coordinateSchemaVersion: 1,
    coordinateMode: 'document',
    sourceViewport: { width: 390, height: 844 },
    sourceDocument: { width: 390, height: 1200 },
    sampleCount: 1,
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    points: [
      { x: 0.5, y: 0.5, count: 1, intensity: 1, coordinateMode: 'document' },
    ],
  },
  {
    groupId: 'desktop-height-mismatch',
    coordinateSchemaVersion: 1,
    coordinateMode: 'document',
    sourceViewport: { width: 1920, height: 911 },
    sourceDocument: { width: 1920, height: 4200 },
    sampleCount: 1,
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    points: [
      { x: 0.5, y: 0.5, count: 1, intensity: 1, coordinateMode: 'document' },
    ],
  },
]

const clickSampleGroups: HeatmapClickSampleGroup[] = [
  {
    groupId: 'desktop-1920',
    coordinateSchemaVersion: 1,
    coordinateMode: 'document',
    sourceViewport: { width: 1920, height: 911 },
    sourceDocument: { width: 1920, height: 2700 },
    sampleCount: 14,
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    samples: [
      {
        x: 0.175,
        y: 0.075,
        weight: 1,
        coordinateMode: 'document',
        anchorId: fixtureAnchorId,
        relativeX: 0.3,
        relativeY: 0.5,
      },
      ...Array.from({ length: 10 }, () => ({
        x: 0.225,
        y: 0.175,
        weight: 1,
        coordinateMode: 'document' as const,
      })),
      { x: 0.275, y: 0.175, weight: 1, coordinateMode: 'document' },
      { x: 0.225, y: 0.212, weight: 1, coordinateMode: 'document' },
      { x: 0.175, y: 0.675, weight: 1, coordinateMode: 'document' },
    ],
  },
  {
    groupId: 'mobile-390',
    coordinateSchemaVersion: 1,
    coordinateMode: 'document',
    sourceViewport: { width: 390, height: 844 },
    sourceDocument: { width: 390, height: 1200 },
    sampleCount: 1,
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    samples: [{ x: 0.5, y: 0.5, weight: 1, coordinateMode: 'document' }],
  },
  {
    groupId: 'desktop-height-mismatch',
    coordinateSchemaVersion: 1,
    coordinateMode: 'document',
    sourceViewport: { width: 1920, height: 911 },
    sourceDocument: { width: 1920, height: 4200 },
    sampleCount: 1,
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    samples: [{ x: 0.5, y: 0.5, weight: 1, coordinateMode: 'document' }],
  },
]

function createSyntheticClickSamples(count: number): HeatmapClickSampleGroup[] {
  return [
    {
      groupId: 'synthetic-desktop-1920',
      coordinateSchemaVersion: 1,
      coordinateMode: 'document',
      sourceViewport: { width: 1920, height: 911 },
      sourceDocument: { width: 1920, height: 2700 },
      sampleCount: count,
      alignment: 'document-compatible',
      safeForDocumentOverlay: true,
      samples: Array.from({ length: count }, (_, index) => ({
        x: ((index % 100) + 1) / 101,
        y: (((index * 17) % 250) + 1) / 1000,
        weight: 1,
        coordinateMode: 'document' as const,
      })),
    },
  ]
}

const movementGroups: HeatmapMovementGroup[] = [
  {
    groupId: 'movement-desktop-1920',
    coordinateSchemaVersion: 1,
    coordinateMode: 'document',
    sourceViewport: { width: 1920, height: 911 },
    sourceDocument: { width: 1920, height: 2700 },
    sampleCount: 6,
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    points: [
      {
        x: 0.65,
        y: 0.25,
        count: 6,
        intensity: 1,
        coordinateMode: 'document',
      },
      {
        x: 0.75,
        y: 0.75,
        count: 2,
        intensity: 0.35,
        coordinateMode: 'document',
      },
    ],
  },
  {
    groupId: 'movement-mobile-390',
    coordinateSchemaVersion: 1,
    coordinateMode: 'document',
    sourceViewport: { width: 390, height: 844 },
    sourceDocument: { width: 390, height: 1200 },
    sampleCount: 1,
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    points: [
      { x: 0.5, y: 0.5, count: 1, intensity: 1, coordinateMode: 'document' },
    ],
  },
  {
    groupId: 'movement-desktop-height-mismatch',
    coordinateSchemaVersion: 1,
    coordinateMode: 'document',
    sourceViewport: { width: 1920, height: 911 },
    sourceDocument: { width: 1920, height: 4200 },
    sampleCount: 1,
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    points: [
      { x: 0.5, y: 0.5, count: 1, intensity: 1, coordinateMode: 'document' },
    ],
  },
]

const scrollPoints: HeatmapScrollPoint[] = [
  { percentage: 2.5, count: 4, intensity: 1 },
  { percentage: 52.5, count: 2, intensity: 0.5 },
  { percentage: 97.5, count: 1, intensity: 0.25 },
]

const scrollGroups: HeatmapScrollGroup[] = [
  {
    groupId: 'scroll-desktop-1920',
    device: 'desktop',
    coordinateSchemaVersion: null,
    sourceViewport: { width: 1920, height: 911 },
    sourceDocument: { width: 1920, height: 2700 },
    sessionCount: 4,
    maximumReachPercent: 100,
    coordinateMode: 'document',
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    reachPoints: scrollPoints,
  },
  {
    groupId: 'scroll-desktop-narrow',
    device: 'desktop',
    coordinateSchemaVersion: null,
    sourceViewport: { width: 1440, height: 900 },
    sourceDocument: { width: 1440, height: 3000 },
    sessionCount: 1,
    maximumReachPercent: 50,
    coordinateMode: 'document',
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    reachPoints: scrollPoints,
  },
]

function Fixture() {
  const [scrollY, setScrollY] = useState(0)
  const [documentHeight, setDocumentHeight] = useState(2700)
  const [maximumReachPercent, setMaximumReachPercent] = useState<number | null>(
    100
  )
  const [measurementReady, setMeasurementReady] = useState(true)
  const [syntheticClickCount, setSyntheticClickCount] = useState<number | null>(
    null
  )
  const [heatmapType, setHeatmapType] = useState<
    'click' | 'movement' | 'scroll'
  >('click')
  const [coverageTruncated, setCoverageTruncated] = useState(false)

  useEffect(() => {
    ;(
      window as Window & { setFixtureScroll?: (value: number) => void }
    ).setFixtureScroll = setScrollY
    ;(
      window as Window & {
        setFixtureDocumentHeight?: (value: number) => void
        setFixtureReach?: (value: number | null) => void
        setFixtureMeasurementReady?: (value: boolean) => void
        setFixtureSyntheticClickCount?: (value: number | null) => void
      }
    ).setFixtureDocumentHeight = setDocumentHeight
    ;(
      window as Window & { setFixtureReach?: (value: number | null) => void }
    ).setFixtureReach = setMaximumReachPercent
    ;(
      window as Window & {
        setFixtureMeasurementReady?: (value: boolean) => void
      }
    ).setFixtureMeasurementReady = setMeasurementReady
    ;(
      window as Window & {
        setFixtureSyntheticClickCount?: (value: number | null) => void
      }
    ).setFixtureSyntheticClickCount = setSyntheticClickCount
    ;(
      window as Window & {
        setFixtureHeatmapType?: (value: 'click' | 'movement' | 'scroll') => void
      }
    ).setFixtureHeatmapType = setHeatmapType
    ;(
      window as Window & {
        setFixtureCoverageTruncated?: (value: boolean) => void
      }
    ).setFixtureCoverageTruncated = setCoverageTruncated
    return () => {
      delete (window as Window & { setFixtureScroll?: unknown })
        .setFixtureScroll
      delete (window as Window & { setFixtureDocumentHeight?: unknown })
        .setFixtureDocumentHeight
      delete (window as Window & { setFixtureReach?: unknown }).setFixtureReach
      delete (window as Window & { setFixtureMeasurementReady?: unknown })
        .setFixtureMeasurementReady
      delete (window as Window & { setFixtureSyntheticClickCount?: unknown })
        .setFixtureSyntheticClickCount
      delete (window as Window & { setFixtureHeatmapType?: unknown })
        .setFixtureHeatmapType
      delete (window as Window & { setFixtureCoverageTruncated?: unknown })
        .setFixtureCoverageTruncated
    }
  }, [])

  const measurement = {
    ...baseMeasurement,
    documentHeight,
    maxScrollY: Math.max(0, documentHeight - baseMeasurement.viewportHeight),
    scrollY,
  }

  const renderedClickSampleGroups =
    syntheticClickCount === null
      ? clickSampleGroups
      : createSyntheticClickSamples(syntheticClickCount)

  return (
    <>
      <HeatmapCompletenessWarning
        coverage={
          heatmapType === 'scroll'
            ? undefined
            : {
                limit: 20_000,
                totalEvents: coverageTruncated ? 20_001 : 100,
                returnedEvents: coverageTruncated ? 20_000 : 100,
                eligibleEvents: coverageTruncated ? 20_000 : 100,
                truncated: coverageTruncated,
              }
        }
        heatmapType={heatmapType === 'click' ? 'click' : 'movement'}
      />
      <div
        data-testid="dashboard-box"
        style={{
          width: 960,
          height: 455,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          data-testid="preview-stage"
          style={{
            width: 1920,
            height: 911,
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
            position: 'relative',
          }}
        >
          <div
            data-testid="iframe-surface"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'white',
            }}
          />
          <HeatmapOverlayLayer
            clickGroups={clickGroups}
            clickSampleGroups={renderedClickSampleGroups}
            anchorDefinitions={fixtureAnchorDefinitions}
            anchorResolutions={fixtureAnchorResolutions}
            anchorSelection={{
              requestedAnchorIds: [fixtureAnchorId],
              referencedAnchorCount: 1,
              eligibleAnchorCount: 1,
              omittedAnchorCount: 0,
            }}
            movementGroups={movementGroups}
            heatmapType={heatmapType}
            scrollPoints={scrollPoints}
            scrollGroups={scrollGroups.map((group, index) => ({
              ...group,
              maximumReachPercent:
                index === 0 ? maximumReachPercent : group.maximumReachPercent,
            }))}
            scrollSource={{
              viewport: { width: 1920, height: 911 },
              document: { width: 1920, height: 2700 },
              provenance: 'tracker-group',
            }}
            measurement={measurementReady ? measurement : null}
            sessionKey="fixture"
          />
        </div>
      </div>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
