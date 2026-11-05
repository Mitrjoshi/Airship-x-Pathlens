import type {
  HeatmapClickPoint,
  HeatmapMovementPoint,
  HeatmapSourceDimensions,
  HeatmapScrollPoint,
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

export function getLegacyScrollReach(
  points: readonly HeatmapScrollPoint[]
): number | null {
  return points
    .filter(
      (point) =>
        Number.isFinite(point.percentage) &&
        point.percentage >= 0 &&
        point.percentage <= 100 &&
        point.count > 0
    )
    .reduce<number | null>(
      (maximum, point) =>
        maximum === null
          ? point.percentage
          : Math.max(maximum, point.percentage),
      null
    )
}
