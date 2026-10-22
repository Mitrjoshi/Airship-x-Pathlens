interface HeatmapOverlayLayerProps {
  sessionKey: string
  hasData: boolean
}

export function HeatmapOverlayLayer({
  sessionKey,
  hasData,
}: HeatmapOverlayLayerProps) {
  return (
    <div
      key={sessionKey}
      aria-label="Heatmap overlay alignment pending"
      className="pointer-events-none absolute inset-0 z-20"
      data-overlay-status="alignment-pending"
      data-overlay-has-data={hasData}
    >
      <div className="bg-background/90 text-muted-foreground absolute top-3 left-3 rounded-md border px-3 py-1.5 text-xs shadow-sm">
        Heatmap overlay alignment pending
      </div>
    </div>
  )
}
