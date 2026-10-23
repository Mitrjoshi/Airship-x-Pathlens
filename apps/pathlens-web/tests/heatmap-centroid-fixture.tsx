import { createRoot } from 'react-dom/client'
import { useEffect, useState } from 'react'
import type {
  HeatmapClickGroup,
  PreviewMeasurementState,
} from '@workspace/contracts'
import { HeatmapOverlayLayer } from '../src/components/common/heatmap-overlay-layer'
import '../src/index.css'

const documentHeight = 3876
const viewportHeight = 762

const measurementBase: PreviewMeasurementState = {
  viewportWidth: 360,
  viewportHeight,
  documentWidth: 360,
  documentHeight,
  scrollX: 0,
  scrollY: 0,
  maxScrollX: 0,
  maxScrollY: documentHeight - viewportHeight,
  layoutVersion: 1,
}

const clickGroup: HeatmapClickGroup = {
  groupId: 'mobile-360-centroids',
  coordinateSchemaVersion: 1,
  coordinateMode: 'document',
  sourceViewport: { width: 360, height: viewportHeight },
  sourceDocument: { width: 360, height: documentHeight },
  sampleCount: 4,
  alignment: 'document-compatible',
  safeForDocumentOverlay: true,
  points: [
    {
      x: 0.1,
      y: 100 / documentHeight,
      count: 1,
      intensity: 1,
      coordinateMode: 'document',
    },
    {
      x: 0.5,
      y: 1000 / documentHeight,
      count: 1,
      intensity: 1,
      coordinateMode: 'document',
    },
    {
      x: 0.2,
      y: 2500 / documentHeight,
      count: 1,
      intensity: 1,
      coordinateMode: 'document',
    },
    {
      x: 0.8,
      y: 3700 / documentHeight,
      count: 1,
      intensity: 1,
      coordinateMode: 'document',
    },
  ],
}

function Fixture() {
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    ;(
      window as Window & { setCentroidScroll?: (value: number) => void }
    ).setCentroidScroll = setScrollY
    return () => {
      delete (window as Window & { setCentroidScroll?: unknown })
        .setCentroidScroll
    }
  }, [])

  return (
    <div
      style={{
        width: 360,
        height: viewportHeight,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ width: 360, height: viewportHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'white' }} />
        <HeatmapOverlayLayer
          clickGroups={[clickGroup]}
          heatmapType="click"
          measurement={{ ...measurementBase, scrollY }}
          sessionKey="centroid-fixture"
        />
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Fixture />)
