import type {
  HeatmapClickPoint,
  HeatmapMovementPoint,
  HeatmapSourceDimensions,
} from '@workspace/contracts'

export type LegacyHeatmapPoint = HeatmapClickPoint | HeatmapMovementPoint

export function getSafeLegacyPoints(
  points: readonly LegacyHeatmapPoint[],
  sourceViewport: HeatmapSourceDimensions | null | undefined,
  liveViewport: HeatmapSourceDimensions
): LegacyHeatmapPoint[] {
  if (
    !sourceViewport ||
    sourceViewport.width <= 0 ||
    sourceViewport.height <= 0
  ) {
    return []
  }
  const sourceClass =
    sourceViewport.width < 600
      ? 'mobile'
      : sourceViewport.width < 1100
        ? 'tablet'
        : 'desktop'
  const liveClass =
    liveViewport.width < 600
      ? 'mobile'
      : liveViewport.width < 1100
        ? 'tablet'
        : 'desktop'
  if (sourceClass !== liveClass) return []

  return points.filter(
    (point) =>
      point.coordinateMode === 'viewport' &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      point.x >= 0 &&
      point.x <= 1 &&
      point.y >= 0 &&
      point.y <= 1 &&
      Number.isFinite(point.count) &&
      point.count > 0
  )
}
