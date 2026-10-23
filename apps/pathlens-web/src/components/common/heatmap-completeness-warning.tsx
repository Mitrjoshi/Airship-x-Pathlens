import type {
  HeatmapClickSampleCoverage,
  HeatmapMovementCoverage,
} from '@workspace/contracts'
import { InfoIcon } from 'lucide-react'

interface HeatmapCompletenessWarningProps {
  heatmapType: 'click' | 'movement'
  coverage: HeatmapClickSampleCoverage | HeatmapMovementCoverage | undefined
}

export function HeatmapCompletenessWarning({
  heatmapType,
  coverage,
}: HeatmapCompletenessWarningProps) {
  if (!coverage?.truncated) return null

  const label = heatmapType === 'click' ? 'clicks' : 'movement events'

  return (
    <div
      aria-live="polite"
      className="text-muted-foreground flex max-w-[min(28rem,calc(100vw-2rem))] items-start gap-1.5 text-xs"
      data-heatmap-completeness-warning
      role="status"
    >
      <InfoIcon
        aria-hidden="true"
        className="text-warning mt-0.5 size-3.5 shrink-0"
      />
      <span>
        Showing {coverage.returnedEvents.toLocaleString()} of{' '}
        {coverage.totalEvents.toLocaleString()} recorded {label}. This heatmap
        represents a limited sample.
      </span>
    </div>
  )
}
