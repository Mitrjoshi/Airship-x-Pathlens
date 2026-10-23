import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import type {
  HeatmapClickGroup,
  HeatmapMovementGroup,
  HeatmapScrollGroup,
  HeatmapScrollPoint,
  PreviewMeasurementState,
} from '@workspace/contracts'
import { HeatmapOverlayLayer } from '../src/components/common/heatmap-overlay-layer'
import { LivePreviewIframe } from '../src/components/common/live-preview-iframe'
import '../src/index.css'

const preview = {
  session_id: '00000000-0000-4000-8000-000000000001',
  iframe_url: `${window.location.origin}/v1/session/test/page`,
  expires_at: '2099-01-01T00:00:00.000Z',
  project_id: '00000000-0000-4000-8000-000000000002',
  domain_id: '00000000-0000-4000-8000-000000000003',
  canonical_hostname: 'fixture.test',
  pathname: '/privacy',
  device: 'desktop' as const,
  preview_intent: 'heatmap' as const,
  protocol_version: 1 as const,
}

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
]

const movementGroups: HeatmapMovementGroup[] = [
  {
    groupId: 'movement-desktop-1920',
    coordinateSchemaVersion: 1,
    coordinateMode: 'document',
    sourceViewport: { width: 1920, height: 911 },
    sourceDocument: { width: 1920, height: 2700 },
    sampleCount: 1,
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    points: [
      { x: 0.65, y: 0.25, count: 6, intensity: 1, coordinateMode: 'document' },
    ],
  },
]

const scrollPoints: HeatmapScrollPoint[] = [
  { percentage: 2.5, count: 1, intensity: 1 },
]

const scrollGroups: HeatmapScrollGroup[] = [
  {
    groupId: 'scroll-desktop-1920',
    device: 'desktop',
    coordinateSchemaVersion: null,
    sourceViewport: { width: 1920, height: 911 },
    sourceDocument: { width: 1920, height: 2700 },
    sessionCount: 1,
    maximumReachPercent: 100,
    coordinateMode: 'document',
    alignment: 'document-compatible',
    safeForDocumentOverlay: true,
    reachPoints: scrollPoints,
  },
]

const scrollSource = {
  viewport: { width: 1920, height: 911 },
  document: { width: 1920, height: 2700 },
  provenance: 'tracker-group' as const,
}

function Fixture() {
  const [measurement, setMeasurement] =
    useState<PreviewMeasurementState | null>(null)
  const [mounted, setMounted] = useState(true)
  const [heatmapType, setHeatmapType] = useState<
    'click' | 'movement' | 'scroll'
  >('click')
  const [device, setDevice] = useState<'desktop' | 'mobile' | 'tablet'>(
    'desktop'
  )

  useEffect(() => {
    const handleMeasurementRequest = (event: MessageEvent<unknown>) => {
      if (
        event.data &&
        typeof event.data === 'object' &&
        'type' in event.data &&
        event.data.type === 'TEST_MEASURE_REQUEST_OBSERVED'
      ) {
        const windowWithDiagnostics = window as Window & {
          __measurementRequestCount?: number
        }
        windowWithDiagnostics.__measurementRequestCount =
          (windowWithDiagnostics.__measurementRequestCount ?? 0) + 1
      }
    }
    window.addEventListener('message', handleMeasurementRequest)
    ;(
      window as Window & {
        setFixtureHeatmapType?: (value: 'click' | 'movement' | 'scroll') => void
        setFixtureDevice?: (value: 'desktop' | 'mobile' | 'tablet') => void
        setFixtureMounted?: (value: boolean) => void
      }
    ).setFixtureHeatmapType = setHeatmapType
    ;(
      window as Window & {
        setFixtureDevice?: (value: 'desktop' | 'mobile' | 'tablet') => void
      }
    ).setFixtureDevice = setDevice
    ;(
      window as Window & {
        setFixtureMounted?: (value: boolean) => void
      }
    ).setFixtureMounted = setMounted
    return () => {
      window.removeEventListener('message', handleMeasurementRequest)
      delete (window as Window & { setFixtureHeatmapType?: unknown })
        .setFixtureHeatmapType
      delete (window as Window & { setFixtureDevice?: unknown })
        .setFixtureDevice
      delete (window as Window & { setFixtureMounted?: unknown })
        .setFixtureMounted
    }
  }, [])

  if (!mounted) return null

  return (
    <div style={{ width: 960, height: 455 }}>
      <LivePreviewIframe
        preview={{ ...preview, device }}
        status="ready"
        virtualViewport={
          device === 'mobile'
            ? { width: 390, height: 844 }
            : device === 'tablet'
              ? { width: 1024, height: 768 }
              : { width: 1920, height: 911 }
        }
        onMeasurementChange={setMeasurement}
        overlay={
          <HeatmapOverlayLayer
            clickGroups={clickGroups}
            movementGroups={movementGroups}
            scrollPoints={scrollPoints}
            scrollGroups={scrollGroups}
            scrollSource={scrollSource}
            heatmapType={heatmapType}
            measurement={measurement}
            sessionKey={preview.session_id}
          />
        }
      />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
