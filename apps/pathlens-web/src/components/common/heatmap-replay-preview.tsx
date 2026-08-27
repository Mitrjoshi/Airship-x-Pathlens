import type { HeatmapClickPoint, HeatmapScrollPoint } from '@/queries/heatmaps'
import type { ReplayEvent } from '@workspace/contracts'
import { ReadOnlyReplayRenderer } from './read-only-replay-renderer'

interface HeatmapReplayPreviewProps {
  events: ReplayEvent[]
  viewport: {
    width: number
    height: number
  } | null
  points?: HeatmapClickPoint[]
  scrollPoints?: HeatmapScrollPoint[]
}

export function HeatmapReplayPreview({
  events,
  viewport,
  points = [],
  scrollPoints = [],
}: HeatmapReplayPreviewProps) {
  return (
    <ReadOnlyReplayRenderer
      events={events}
      viewport={viewport}
      fallback={
        <div className="text-muted-foreground flex size-full items-center justify-center p-6 text-center text-sm">
          Page preview unavailable. Interaction data is still available for this
          page.
        </div>
      }
    >
      <div className="pointer-events-none absolute inset-0">
        {scrollPoints.map((point) => {
          const center = Math.min(100, Math.max(0, point.percentage))
          const top = Math.max(0, center - 2.5)
          const height = Math.min(5, 100 - top)
          const intensity = Math.min(1, Math.max(0, point.intensity))

          return (
            <div
              key={point.percentage}
              className="absolute inset-x-0 bg-gradient-to-r from-transparent via-red-500 to-transparent"
              style={{
                top: `${top}%`,
                height: `${height}%`,
                opacity: 0.12 + intensity * 0.68,
              }}
              title={`${point.count} sessions reached ${Math.round(center)}%`}
            />
          )
        })}
        {points.map((point) => (
          <span
            key={`${point.x}-${point.y}`}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${point.x * 100}%`,
              top: `${point.y * 100}%`,
              width: `${24 + point.intensity * 46}px`,
              height: `${24 + point.intensity * 46}px`,
              background: `radial-gradient(circle, rgb(239 68 68 / ${0.2 + point.intensity * 0.55}) 0%, rgb(249 115 22 / ${0.12 + point.intensity * 0.25}) 35%, transparent 72%)`,
            }}
            title={`${point.count} clicks`}
          />
        ))}
      </div>
    </ReadOnlyReplayRenderer>
  )
}
