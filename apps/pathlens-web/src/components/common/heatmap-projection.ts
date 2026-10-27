import type {
  HeatmapClickAnchorDefinition,
  HeatmapClickSample,
  HeatmapClickPoint,
  HeatmapMovementPoint,
  PreviewAnchorResolution,
  PreviewMeasurementState,
  PreviewRegionResolution,
} from '@workspace/contracts'

type HeatmapOverlayPoint = HeatmapClickPoint | HeatmapMovementPoint

export interface ProjectionDimensions {
  width: number
  height: number
}

export interface ClickHotspotProjection {
  x: number
  y: number
}

export type ClickProjectionMode =
  'anchored' | 'region' | 'document' | 'excluded'

export interface ClickProjectionDecision {
  projection: ClickHotspotProjection | null
  mode: ClickProjectionMode
  reason?: string
}

function validDimensions(
  value: ProjectionDimensions | null
): value is ProjectionDimensions {
  return Boolean(
    value &&
    Number.isFinite(value.width) &&
    Number.isFinite(value.height) &&
    value.width > 0 &&
    value.height > 0
  )
}

function validRelativePosition(value: number | undefined): value is number {
  return (
    value !== undefined && Number.isFinite(value) && value >= 0 && value <= 1
  )
}

function validMeasurementDimensions(
  measurement: PreviewMeasurementState
): boolean {
  return (
    validDimensions({
      width: measurement.viewportWidth,
      height: measurement.viewportHeight,
    }) &&
    validDimensions({
      width: measurement.documentWidth,
      height: measurement.documentHeight,
    })
  )
}

function validAnchorResolution(
  resolution: PreviewAnchorResolution | undefined,
  definition: HeatmapClickAnchorDefinition,
  measurement: PreviewMeasurementState
): resolution is PreviewAnchorResolution & {
  status: 'matched'
  rect: NonNullable<PreviewAnchorResolution['rect']>
} {
  if (
    !resolution ||
    resolution.status !== 'matched' ||
    !resolution.rect ||
    !validDimensions({
      width: resolution.rect.width,
      height: resolution.rect.height,
    }) ||
    resolution.rect.width <= 0 ||
    resolution.rect.height <= 0 ||
    resolution.rect.left < -measurement.viewportWidth ||
    resolution.rect.top < -measurement.viewportHeight ||
    resolution.rect.left > measurement.viewportWidth ||
    resolution.rect.top > measurement.viewportHeight
  ) {
    return false
  }
  if (resolution.positionMode !== definition.positionMode) return false
  if (
    definition.effectivePositionMode &&
    resolution.effectivePositionMode !== definition.effectivePositionMode
  ) {
    return false
  }
  if (
    definition.positioningAncestorDepth !== undefined &&
    resolution.positioningAncestorDepth !== definition.positioningAncestorDepth
  ) {
    return false
  }
  if (
    definition.positioningAncestorAnchorId !== undefined &&
    resolution.positioningAncestorAnchorId !==
      definition.positioningAncestorAnchorId
  ) {
    return false
  }
  return true
}

function projectRegionSample(
  sample: HeatmapClickSample,
  resolution: PreviewRegionResolution | undefined,
  measurement: PreviewMeasurementState,
  display: ProjectionDimensions
): ClickHotspotProjection | null {
  if (
    !sample.regionAnchor ||
    resolution?.status !== 'matched' ||
    !resolution.rect ||
    resolution.positionMode !== sample.regionAnchor.positionMode ||
    (sample.regionAnchor.regionKind !== undefined &&
      resolution.regionKind !== sample.regionAnchor.regionKind) ||
    (sample.regionAnchor.structuralFingerprint !== undefined &&
      resolution.structuralFingerprint !==
        sample.regionAnchor.structuralFingerprint) ||
    !validRelativePosition(sample.regionAnchor.relativeX) ||
    !validRelativePosition(sample.regionAnchor.relativeY) ||
    !validDimensions({
      width: resolution.rect.width,
      height: resolution.rect.height,
    }) ||
    resolution.rect.left < -measurement.viewportWidth ||
    resolution.rect.top < -measurement.viewportHeight ||
    resolution.rect.left > measurement.viewportWidth ||
    resolution.rect.top > measurement.viewportHeight
  ) {
    return null
  }
  return {
    x:
      ((resolution.rect.left +
        sample.regionAnchor.relativeX * resolution.rect.width) /
        measurement.viewportWidth) *
      display.width,
    y:
      ((resolution.rect.top +
        sample.regionAnchor.relativeY * resolution.rect.height) /
        measurement.viewportHeight) *
      display.height,
  }
}

export function projectClickPoint(
  point: Pick<HeatmapOverlayPoint, 'x' | 'y' | 'coordinateMode'>,
  measurement: PreviewMeasurementState,
  display: ProjectionDimensions
): ClickHotspotProjection | null {
  if (
    point.coordinateMode !== 'document' ||
    !validDimensions(display) ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < 0 ||
    point.x > 1 ||
    point.y < 0 ||
    point.y > 1 ||
    !validMeasurementDimensions(measurement)
  ) {
    return null
  }

  const documentX = point.x * measurement.documentWidth
  const documentY = point.y * measurement.documentHeight

  return {
    x:
      ((documentX - measurement.scrollX) / measurement.viewportWidth) *
      display.width,
    y:
      ((documentY - measurement.scrollY) / measurement.viewportHeight) *
      display.height,
  }
}

export function projectViewportPoint(
  point: Pick<HeatmapOverlayPoint, 'x' | 'y' | 'coordinateMode'>,
  measurement: PreviewMeasurementState,
  display: ProjectionDimensions,
  sourceViewport: ProjectionDimensions
): ClickHotspotProjection | null {
  if (
    point.coordinateMode !== 'viewport' ||
    !validDimensions(display) ||
    !validDimensions(sourceViewport) ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < 0 ||
    point.x > 1 ||
    point.y < 0 ||
    point.y > 1 ||
    !validMeasurementDimensions(measurement)
  ) {
    return null
  }

  return {
    x: point.x * display.width,
    y: point.y * display.height,
  }
}

export function projectClickSample(
  sample: HeatmapClickSample,
  measurement: PreviewMeasurementState,
  display: ProjectionDimensions,
  definitions: ReadonlyMap<string, HeatmapClickAnchorDefinition>,
  resolutions: ReadonlyMap<string, PreviewAnchorResolution>,
  sourceViewport: ProjectionDimensions = {
    width: measurement.viewportWidth,
    height: measurement.viewportHeight,
  },
  regionResolutions: ReadonlyMap<string, PreviewRegionResolution> = new Map()
): ClickProjectionDecision {
  if (!sample.anchorId) {
    if (sample.regionAnchor) {
      const projection = projectRegionSample(
        sample,
        regionResolutions.get(sample.regionAnchor.regionId),
        measurement,
        display
      )
      return projection
        ? { projection, mode: 'region' }
        : { projection: null, mode: 'excluded', reason: 'region-unresolved' }
    }
    const projection =
      sample.coordinateMode === 'viewport'
        ? projectViewportPoint(sample, measurement, display, sourceViewport)
        : projectClickPoint(sample, measurement, display)
    return projection
      ? { projection, mode: 'document' }
      : { projection: null, mode: 'excluded', reason: 'invalid-coordinate' }
  }

  const definition = definitions.get(sample.anchorId)
  if (!definition) {
    if (sample.regionAnchor) {
      const projection = projectRegionSample(
        sample,
        regionResolutions.get(sample.regionAnchor.regionId),
        measurement,
        display
      )
      if (projection) return { projection, mode: 'region' }
    }
    return {
      projection: null,
      mode: 'excluded',
      reason: 'anchor-definition-unavailable',
    }
  }
  const requiresAnchor =
    definition.positionMode === 'fixed' ||
    definition.positionMode === 'sticky' ||
    definition.effectivePositionMode === 'fixed' ||
    definition.effectivePositionMode === 'sticky' ||
    definition.scrollAncestors.length > 0
  const resolution = resolutions.get(sample.anchorId)

  if (
    validRelativePosition(sample.relativeX) &&
    validRelativePosition(sample.relativeY) &&
    validAnchorResolution(resolution, definition, measurement)
  ) {
    return {
      projection: {
        x:
          ((resolution.rect.left + sample.relativeX * resolution.rect.width) /
            measurement.viewportWidth) *
          display.width,
        y:
          ((resolution.rect.top + sample.relativeY * resolution.rect.height) /
            measurement.viewportHeight) *
          display.height,
      },
      mode: 'anchored',
    }
  }

  if (sample.regionAnchor) {
    return {
      projection: null,
      mode: 'excluded',
      reason: 'anchor-unresolved',
    }
  }

  if (requiresAnchor) {
    return {
      projection: null,
      mode: 'excluded',
      reason:
        resolution?.status === 'ambiguous'
          ? 'anchor-ambiguous'
          : resolution?.status === 'missing'
            ? 'anchor-missing'
            : 'anchor-unresolved',
    }
  }

  const projection =
    sample.coordinateMode === 'viewport'
      ? projectViewportPoint(sample, measurement, display, sourceViewport)
      : projectClickPoint(sample, measurement, display)
  return projection
    ? { projection, mode: 'document', reason: 'anchor-fallback-document' }
    : { projection: null, mode: 'excluded', reason: 'invalid-coordinate' }
}
