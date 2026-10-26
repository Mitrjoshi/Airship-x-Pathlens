import type {
  HeatmapClickGroup,
  HeatmapClickAnchorDefinition,
  HeatmapClickSample,
  HeatmapClickPoint,
  HeatmapClickSampleGroup,
  HeatmapMovementGroup,
  HeatmapSnapshot,
  HeatmapMovementPoint,
  HeatmapScrollGroup,
  HeatmapScrollPoint,
  PreviewMeasurementState,
  PreviewAnchorResolution,
} from '@workspace/contracts'
import { useEffect, useRef, useState } from 'react'

const DIMENSION_TOLERANCE_RATIO = 0.12
const DIMENSION_TOLERANCE_PX = 96
const MAX_HOTSPOT_RADIUS = 52
const MAX_REQUESTED_ANCHORS = 256

interface Dimensions {
  width: number
  height: number
}

export interface ClickHotspotProjection {
  x: number
  y: number
}

export interface ClickOverlayViewport {
  width: number
  height: number
}

export interface ClickGroupOverlayDecision {
  compatible: boolean
  reason: string
}

export interface ClickAnchorSelection {
  requestedAnchorIds: string[]
  referencedAnchorCount: number
  eligibleAnchorCount: number
  omittedAnchorCount: number
}

export interface ClickProjectionDiagnostics {
  anchoredSamples: number
  legacySamples: number
  unresolvedAnchorSamples: number
  missingAnchorSamples: number
  ambiguousAnchorSamples: number
  omittedAnchorSamples: number
  geometryIncompatibleSamples: number
}

export type HeatmapOverlayType = 'click' | 'movement' | 'scroll'
export type PreviewDevice = 'desktop' | 'mobile' | 'tablet'
type HeatmapOverlayGroup =
  HeatmapClickGroup | HeatmapClickSampleGroup | HeatmapMovementGroup
type HeatmapOverlayPoint = HeatmapClickPoint | HeatmapMovementPoint

const DEFAULT_PREVIEW_VIEWPORTS: Record<PreviewDevice, ClickOverlayViewport> = {
  desktop: { width: 1280, height: 720 },
  mobile: { width: 390, height: 844 },
  tablet: { width: 1024, height: 768 },
}

export interface ScrollOverlayDimensions {
  viewport: Dimensions
  document: Dimensions
  provenance: 'tracker-group' | 'snapshot'
}

function validDimensions(value: Dimensions | null): value is Dimensions {
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

function isPositioningAnchor(
  definition: HeatmapClickAnchorDefinition
): boolean {
  return (
    definition.positionMode === 'fixed' ||
    definition.positionMode === 'sticky' ||
    definition.effectivePositionMode === 'fixed' ||
    definition.effectivePositionMode === 'sticky'
  )
}

function isEligibleClickSampleGroup(
  group: HeatmapClickSampleGroup,
  viewport: ClickOverlayViewport
): boolean {
  return (
    group.coordinateMode === 'document' &&
    group.alignment === 'document-compatible' &&
    group.safeForDocumentOverlay &&
    group.sourceViewport?.width === viewport.width &&
    group.sourceViewport?.height === viewport.height &&
    validDimensions(group.sourceDocument)
  )
}

export function selectClickAnchorIds(
  sampleGroups: readonly HeatmapClickSampleGroup[],
  definitions: readonly HeatmapClickAnchorDefinition[],
  viewport: ClickOverlayViewport,
  maximum = MAX_REQUESTED_ANCHORS
): ClickAnchorSelection {
  const definitionMap = new Map(
    definitions.map((definition) => [definition.anchorId, definition])
  )
  const sampleCounts = new Map<string, number>()

  for (const group of sampleGroups) {
    if (!isEligibleClickSampleGroup(group, viewport)) continue
    for (const sample of group.samples) {
      if (
        !sample.anchorId ||
        !validRelativePosition(sample.relativeX) ||
        !validRelativePosition(sample.relativeY) ||
        !definitionMap.has(sample.anchorId)
      ) {
        continue
      }
      sampleCounts.set(
        sample.anchorId,
        (sampleCounts.get(sample.anchorId) ?? 0) + 1
      )
    }
  }

  const ordered = Array.from(sampleCounts.keys()).sort((left, right) => {
    const leftDefinition = definitionMap.get(left)!
    const rightDefinition = definitionMap.get(right)!
    const leftPriority = isPositioningAnchor(leftDefinition) ? 0 : 1
    const rightPriority = isPositioningAnchor(rightDefinition) ? 0 : 1
    return (
      leftPriority - rightPriority ||
      (sampleCounts.get(right) ?? 0) - (sampleCounts.get(left) ?? 0) ||
      left.localeCompare(right)
    )
  })
  const requestedAnchorIds = ordered.slice(0, maximum)

  return {
    requestedAnchorIds,
    referencedAnchorCount: ordered.length,
    eligibleAnchorCount: ordered.length,
    omittedAnchorCount: Math.max(0, ordered.length - requestedAnchorIds.length),
  }
}

export function getClickOverlayViewport(
  groups: readonly HeatmapOverlayGroup[]
): ClickOverlayViewport | null {
  const compatibleGroups = groups.filter(
    (group) =>
      group.coordinateMode === 'document' &&
      group.alignment === 'document-compatible' &&
      group.safeForDocumentOverlay &&
      validDimensions(group.sourceViewport) &&
      validDimensions(group.sourceDocument)
  )
  const first = compatibleGroups[0]?.sourceViewport
  if (!first) return null
  if (
    compatibleGroups.some(
      (group) =>
        group.sourceViewport?.width !== first.width ||
        group.sourceViewport?.height !== first.height
    )
  ) {
    return null
  }
  return { width: first.width, height: first.height }
}

function matchesPreviewDevice(width: number, device: PreviewDevice): boolean {
  if (device === 'mobile') return width < 600
  if (device === 'tablet') return width >= 600 && width < 1100
  return width >= 1100
}

export function getPreviewViewportForDevice(
  groups: readonly HeatmapOverlayGroup[],
  device: PreviewDevice
): ClickOverlayViewport {
  const deviceGroups = groups.filter(
    (group) =>
      validDimensions(group.sourceViewport) &&
      matchesPreviewDevice(group.sourceViewport.width, device)
  )
  return (
    getClickOverlayViewport(deviceGroups) ?? DEFAULT_PREVIEW_VIEWPORTS[device]
  )
}

export function getRepresentativeClickOverlayViewport(
  groups: readonly HeatmapOverlayGroup[],
  device: PreviewDevice
): ClickOverlayViewport {
  const candidate = groups
    .filter(
      (group) =>
        group.coordinateMode === 'document' &&
        group.alignment === 'document-compatible' &&
        group.safeForDocumentOverlay &&
        validDimensions(group.sourceViewport) &&
        matchesPreviewDevice(group.sourceViewport.width, device)
    )
    .reduce<HeatmapOverlayGroup | null>(
      (current, group) =>
        !current || group.sampleCount > current.sampleCount ? group : current,
      null
    )

  return candidate?.sourceViewport ?? DEFAULT_PREVIEW_VIEWPORTS[device]
}

export function getSharedOverlayDimensions(
  groups: readonly HeatmapOverlayGroup[],
  provenance: ScrollOverlayDimensions['provenance'] = 'tracker-group'
): ScrollOverlayDimensions | null {
  const compatibleGroups = groups.filter(
    (group) =>
      group.coordinateMode === 'document' &&
      group.alignment === 'document-compatible' &&
      group.safeForDocumentOverlay &&
      validDimensions(group.sourceViewport) &&
      validDimensions(group.sourceDocument)
  )
  const first = compatibleGroups[0]
  if (!first?.sourceViewport || !first.sourceDocument) return null
  if (
    compatibleGroups.some(
      (group) =>
        group.sourceViewport?.width !== first.sourceViewport?.width ||
        group.sourceViewport?.height !== first.sourceViewport?.height ||
        group.sourceDocument?.width !== first.sourceDocument?.width ||
        group.sourceDocument?.height !== first.sourceDocument?.height
    )
  ) {
    return null
  }
  return {
    viewport: first.sourceViewport,
    document: first.sourceDocument,
    provenance,
  }
}

export const getMovementOverlayViewport = getClickOverlayViewport

export function getScrollOverlayViewport(
  source: ScrollOverlayDimensions | null
): ClickOverlayViewport | null {
  return source &&
    validDimensions(source.viewport) &&
    validDimensions(source.document)
    ? source.viewport
    : null
}

export function getSnapshotScrollOverlayDimensions(
  snapshot: HeatmapSnapshot | null,
  device: PreviewDevice
): ScrollOverlayDimensions | null {
  if (
    !snapshot ||
    (snapshot.device !== device &&
      !(device === 'desktop' && snapshot.device === 'all')) ||
    snapshot.pageWidth === null ||
    snapshot.pageHeight === null ||
    snapshot.viewportWidth <= 0 ||
    snapshot.viewportHeight <= 0
  ) {
    return null
  }

  return {
    viewport: {
      width: snapshot.viewportWidth,
      height: snapshot.viewportHeight,
    },
    document: { width: snapshot.pageWidth, height: snapshot.pageHeight },
    provenance: 'snapshot',
  }
}

export function getScrollGroupOverlayViewport(
  groups: readonly HeatmapScrollGroup[],
  device: PreviewDevice
): ClickOverlayViewport | null {
  const candidates = groups.filter(
    (group) =>
      group.safeForDocumentOverlay &&
      group.alignment === 'document-compatible' &&
      validDimensions(group.sourceViewport) &&
      matchesPreviewDevice(group.sourceViewport.width, device)
  )
  const representative = candidates.reduce((current, candidate) =>
    candidate.sessionCount > current.sessionCount ? candidate : current
  )
  const viewport = representative.sourceViewport
  return viewport ? { width: viewport.width, height: viewport.height } : null
}

function dimensionsCompatible(source: Dimensions, live: Dimensions): boolean {
  return (
    dimensionCompatible(source.width, live.width) &&
    dimensionCompatible(source.height, live.height)
  )
}

function dimensionCompatible(source: number, live: number): boolean {
  return (
    Math.abs(source - live) <=
    Math.max(DIMENSION_TOLERANCE_PX, source * DIMENSION_TOLERANCE_RATIO)
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

export function getScrollOverlayDecision(
  source: ScrollOverlayDimensions | null,
  measurement: PreviewMeasurementState | null
): ClickGroupOverlayDecision {
  if (!source) {
    return { compatible: false, reason: 'source-dimensions-unavailable' }
  }
  if (!measurement) {
    return { compatible: false, reason: 'measurement-unavailable' }
  }
  if (measurement.layoutVersion <= 0) {
    return { compatible: false, reason: 'layout-not-stable' }
  }
  if (!validDimensions(source.viewport)) {
    return { compatible: false, reason: 'source-viewport-invalid' }
  }
  if (!validDimensions(source.document)) {
    return { compatible: false, reason: 'source-document-invalid' }
  }
  if (!validMeasurementDimensions(measurement)) {
    return { compatible: false, reason: 'live-dimensions-invalid' }
  }
  if (
    !dimensionsCompatible(source.viewport, {
      width: measurement.viewportWidth,
      height: measurement.viewportHeight,
    })
  ) {
    return { compatible: false, reason: 'viewport-dimensions-incompatible' }
  }
  if (
    !dimensionsCompatible(source.document, {
      width: measurement.documentWidth,
      height: measurement.documentHeight,
    })
  ) {
    return { compatible: false, reason: 'document-dimensions-incompatible' }
  }
  return { compatible: true, reason: 'compatible' }
}

export function getClickGroupOverlayDecision(
  group: HeatmapOverlayGroup,
  measurement: PreviewMeasurementState | null
): ClickGroupOverlayDecision {
  if (!measurement) {
    return { compatible: false, reason: 'measurement-unavailable' }
  }
  if (measurement.layoutVersion <= 0) {
    return { compatible: false, reason: 'layout-not-stable' }
  }

  if (group.coordinateMode !== 'document') {
    return { compatible: false, reason: 'coordinate-mode-not-document' }
  }
  if (group.alignment !== 'document-compatible') {
    return { compatible: false, reason: 'alignment-not-document-compatible' }
  }
  if (!group.safeForDocumentOverlay) {
    return { compatible: false, reason: 'document-overlay-not-safe' }
  }
  if (!validDimensions(group.sourceViewport)) {
    return { compatible: false, reason: 'source-viewport-invalid' }
  }
  if (!validDimensions(group.sourceDocument)) {
    return { compatible: false, reason: 'source-document-invalid' }
  }
  const liveViewport = {
    width: measurement.viewportWidth,
    height: measurement.viewportHeight,
  }
  if (!validDimensions(liveViewport)) {
    return { compatible: false, reason: 'live-viewport-invalid' }
  }
  const liveDocument = {
    width: measurement.documentWidth,
    height: measurement.documentHeight,
  }
  if (!validDimensions(liveDocument)) {
    return { compatible: false, reason: 'live-document-invalid' }
  }
  if (!dimensionsCompatible(group.sourceViewport, liveViewport)) {
    return { compatible: false, reason: 'viewport-dimensions-incompatible' }
  }
  if (!dimensionCompatible(group.sourceDocument.width, liveDocument.width)) {
    return { compatible: false, reason: 'document-width-incompatible' }
  }
  if (!dimensionCompatible(group.sourceDocument.height, liveDocument.height)) {
    return { compatible: false, reason: 'document-height-incompatible' }
  }

  return { compatible: true, reason: 'compatible' }
}

export function isClickGroupOverlayCompatible(
  group: HeatmapOverlayGroup,
  measurement: PreviewMeasurementState | null
): boolean {
  return getClickGroupOverlayDecision(group, measurement).compatible
}

export function projectClickPoint(
  point: Pick<HeatmapOverlayPoint, 'x' | 'y' | 'coordinateMode'>,
  measurement: PreviewMeasurementState,
  display: Dimensions
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
    !Number.isFinite(measurement.viewportWidth) ||
    !Number.isFinite(measurement.viewportHeight) ||
    !Number.isFinite(measurement.documentWidth) ||
    !Number.isFinite(measurement.documentHeight) ||
    measurement.viewportWidth <= 0 ||
    measurement.viewportHeight <= 0 ||
    measurement.documentWidth <= 0 ||
    measurement.documentHeight <= 0
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
  return true
}

export function projectClickSample(
  sample: HeatmapClickSample,
  measurement: PreviewMeasurementState,
  display: Dimensions,
  definitions: ReadonlyMap<string, HeatmapClickAnchorDefinition>,
  resolutions: ReadonlyMap<string, PreviewAnchorResolution>
): {
  projection: ClickHotspotProjection | null
  mode: 'anchored' | 'document' | 'excluded'
  reason?: string
} {
  if (!sample.anchorId) {
    return {
      projection: projectClickPoint(sample, measurement, display),
      mode: 'document',
    }
  }

  const definition = definitions.get(sample.anchorId)
  if (!definition) {
    return {
      projection: null,
      mode: 'excluded',
      reason: 'anchor-definition-unavailable',
    }
  }
  const requiresAnchor =
    isPositioningAnchor(definition) || definition.scrollAncestors.length > 0
  const resolution = resolutions.get(sample.anchorId)

  if (
    validRelativePosition(sample.relativeX) &&
    validRelativePosition(sample.relativeY)
  ) {
    if (validAnchorResolution(resolution, definition, measurement)) {
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

  return {
    projection: projectClickPoint(sample, measurement, display),
    mode: 'document',
    reason: 'anchor-fallback-document',
  }
}

export function projectScrollDepth(
  point: HeatmapScrollPoint,
  measurement: PreviewMeasurementState,
  display: Dimensions
): ClickHotspotProjection | null {
  if (
    !validDimensions(display) ||
    !Number.isFinite(point.percentage) ||
    point.percentage < 0 ||
    point.percentage > 100 ||
    !validMeasurementDimensions(measurement)
  ) {
    return null
  }

  const maxScrollY = Math.max(
    0,
    measurement.documentHeight - measurement.viewportHeight
  )
  const documentY = (point.percentage / 100) * maxScrollY

  return {
    x: 0,
    y:
      ((documentY - measurement.scrollY) / measurement.viewportHeight) *
      display.height,
  }
}

function hotspotRadius(
  point: HeatmapOverlayPoint,
  heatmapType: HeatmapOverlayType
): number {
  const intensity = Math.min(1, Math.max(0, point.intensity))
  const count = Math.max(0, Number.isFinite(point.count) ? point.count : 0)
  return Math.min(
    MAX_HOTSPOT_RADIUS,
    heatmapType === 'movement'
      ? 20 + intensity * 38 + Math.sqrt(count) * 3
      : 14 + intensity * 24 + Math.sqrt(count) * 2
  )
}

function drawHotspot(
  context: CanvasRenderingContext2D,
  point: HeatmapOverlayPoint,
  projection: ClickHotspotProjection,
  heatmapType: HeatmapOverlayType
): void {
  const intensity = Math.min(1, Math.max(0, point.intensity))
  const radius = hotspotRadius(point, heatmapType)
  const gradient = context.createRadialGradient(
    projection.x,
    projection.y,
    0,
    projection.x,
    projection.y,
    radius
  )
  gradient.addColorStop(
    0,
    heatmapType === 'movement'
      ? `rgba(30, 64, 175, ${0.38 + intensity * 0.42})`
      : `rgba(220, 38, 38, ${0.72 + intensity * 0.2})`
  )
  gradient.addColorStop(
    0.35,
    heatmapType === 'movement'
      ? `rgba(6, 182, 212, ${0.3 + intensity * 0.35})`
      : `rgba(249, 115, 22, ${0.5 + intensity * 0.2})`
  )
  gradient.addColorStop(
    1,
    heatmapType === 'movement'
      ? 'rgba(45, 212, 191, 0)'
      : 'rgba(250, 204, 21, 0)'
  )
  context.fillStyle = gradient
  context.beginPath()
  context.arc(projection.x, projection.y, radius, 0, Math.PI * 2)
  context.fill()
}

function colorizeDensity(value: number): [number, number, number] {
  const stops: Array<[number, [number, number, number]]> = [
    [0, [34, 197, 94]],
    [0.35, [250, 204, 21]],
    [0.7, [249, 115, 22]],
    [1, [220, 38, 38]],
  ]
  const normalized = Math.min(1, Math.max(0, value))
  for (let index = 1; index < stops.length; index += 1) {
    const [end, endColor] = stops[index]!
    const [start, startColor] = stops[index - 1]!
    if (normalized > end) continue
    const ratio = (normalized - start) / (end - start)
    return [
      Math.round(startColor[0] + (endColor[0] - startColor[0]) * ratio),
      Math.round(startColor[1] + (endColor[1] - startColor[1]) * ratio),
      Math.round(startColor[2] + (endColor[2] - startColor[2]) * ratio),
    ]
  }
  return stops[stops.length - 1]![1]
}

function drawClickDensity(
  context: CanvasRenderingContext2D,
  sampleGroups: readonly HeatmapClickSampleGroup[],
  measurement: PreviewMeasurementState,
  width: number,
  height: number,
  devicePixelRatio: number,
  definitions: ReadonlyMap<string, HeatmapClickAnchorDefinition>,
  resolutions: ReadonlyMap<string, PreviewAnchorResolution>,
  anchorSelection: ClickAnchorSelection | null
): {
  compatibleGroups: number
  drawnPoints: number
  rejectionReasons: Record<string, number>
  diagnostics: ClickProjectionDiagnostics
} {
  const backingWidth = Math.max(1, Math.round(width * devicePixelRatio))
  const backingHeight = Math.max(1, Math.round(height * devicePixelRatio))
  const densityCanvas = document.createElement('canvas')
  densityCanvas.width = backingWidth
  densityCanvas.height = backingHeight
  const densityContext = densityCanvas.getContext('2d')
  if (!densityContext) {
    return {
      compatibleGroups: 0,
      drawnPoints: 0,
      rejectionReasons: {},
      diagnostics: {
        anchoredSamples: 0,
        legacySamples: 0,
        unresolvedAnchorSamples: 0,
        missingAnchorSamples: 0,
        ambiguousAnchorSamples: 0,
        omittedAnchorSamples: 0,
        geometryIncompatibleSamples: 0,
      },
    }
  }

  const radius =
    42 *
    Math.min(
      width / measurement.viewportWidth,
      height / measurement.viewportHeight
    ) *
    devicePixelRatio
  const rejectionReasons: Record<string, number> = {}
  let compatibleGroups = 0
  let drawnPoints = 0
  const diagnostics: ClickProjectionDiagnostics = {
    anchoredSamples: 0,
    legacySamples: 0,
    unresolvedAnchorSamples: 0,
    missingAnchorSamples: 0,
    ambiguousAnchorSamples: 0,
    omittedAnchorSamples: 0,
    geometryIncompatibleSamples: 0,
  }
  densityContext.globalCompositeOperation = 'lighter'

  const orderedGroups = [...sampleGroups].sort((left, right) =>
    left.groupId.localeCompare(right.groupId)
  )
  const requestedAnchorIds = anchorSelection
    ? new Set(anchorSelection.requestedAnchorIds)
    : null
  for (const group of orderedGroups) {
    const decision = getClickGroupOverlayDecision(group, measurement)
    if (!decision.compatible) {
      diagnostics.geometryIncompatibleSamples += group.samples.length
      rejectionReasons[decision.reason] =
        (rejectionReasons[decision.reason] ?? 0) + 1
      continue
    }
    compatibleGroups += 1
    const samples = [...group.samples].sort(
      (left, right) =>
        left.x - right.x ||
        left.y - right.y ||
        left.weight - right.weight ||
        left.coordinateMode.localeCompare(right.coordinateMode)
    )
    for (const sample of samples) {
      if (
        sample.anchorId &&
        requestedAnchorIds &&
        !requestedAnchorIds.has(sample.anchorId)
      ) {
        diagnostics.omittedAnchorSamples += 1
      }
      const projected = projectClickSample(
        sample,
        measurement,
        {
          width,
          height,
        },
        definitions,
        resolutions
      )
      if (projected.mode === 'anchored') diagnostics.anchoredSamples += 1
      else if (projected.mode === 'document') {
        if (!sample.anchorId) diagnostics.legacySamples += 1
      } else {
        diagnostics.unresolvedAnchorSamples += 1
        if (projected.reason === 'anchor-missing') {
          diagnostics.missingAnchorSamples += 1
        }
        if (projected.reason === 'anchor-ambiguous') {
          diagnostics.ambiguousAnchorSamples += 1
        }
      }
      const projection = projected.projection
      if (
        !projection ||
        projection.x < -radius / devicePixelRatio ||
        projection.y < -radius / devicePixelRatio ||
        projection.x > width + radius / devicePixelRatio ||
        projection.y > height + radius / devicePixelRatio
      ) {
        continue
      }
      const x = projection.x * devicePixelRatio
      const y = projection.y * devicePixelRatio
      const contribution = Math.min(0.24, Math.max(0.01, sample.weight * 0.06))
      const gradient = densityContext.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        radius
      )
      gradient.addColorStop(0, `rgba(255, 255, 255, ${contribution})`)
      gradient.addColorStop(0.35, `rgba(255, 255, 255, ${contribution * 0.55})`)
      gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
      densityContext.fillStyle = gradient
      densityContext.beginPath()
      densityContext.arc(x, y, radius, 0, Math.PI * 2)
      densityContext.fill()
      drawnPoints += 1
    }
  }

  const density = densityContext.getImageData(0, 0, backingWidth, backingHeight)
  let maximumAlpha = 0
  for (let index = 3; index < density.data.length; index += 4) {
    maximumAlpha = Math.max(maximumAlpha, density.data[index] ?? 0)
  }
  if (maximumAlpha === 0) {
    return { compatibleGroups, drawnPoints, rejectionReasons, diagnostics }
  }

  const output = context.createImageData(backingWidth, backingHeight)
  for (let index = 0; index < density.data.length; index += 4) {
    const alpha = density.data[index + 3] ?? 0
    if (alpha === 0) continue
    const normalized = alpha / maximumAlpha
    const [red, green, blue] = colorizeDensity(normalized)
    output.data[index] = red
    output.data[index + 1] = green
    output.data[index + 2] = blue
    output.data[index + 3] = Math.min(
      235,
      Math.round((0.02 + Math.pow(normalized, 0.65) * 0.82) * 255)
    )
  }
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.putImageData(output, 0, 0)
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
  return { compatibleGroups, drawnPoints, rejectionReasons, diagnostics }
}

function drawScrollRegions(
  context: CanvasRenderingContext2D,
  maximumReachPercent: number,
  width: number,
  height: number,
  measurement: PreviewMeasurementState
): number | null {
  if (
    !Number.isFinite(maximumReachPercent) ||
    maximumReachPercent < 0 ||
    maximumReachPercent > 100 ||
    !validMeasurementDimensions(measurement)
  ) {
    return null
  }

  const reachedDocumentHeight =
    measurement.documentHeight * (maximumReachPercent / 100)
  const boundary =
    ((reachedDocumentHeight - measurement.scrollY) /
      measurement.viewportHeight) *
    height
  const clippedBoundary = Math.min(height, Math.max(0, boundary))

  context.fillStyle = 'rgba(34, 197, 94, 0.16)'
  context.fillRect(0, 0, width, clippedBoundary)
  context.fillStyle = 'rgba(248, 113, 113, 0.16)'
  context.fillRect(0, clippedBoundary, width, height - clippedBoundary)
  return clippedBoundary
}

interface HeatmapOverlayLayerProps {
  clickGroups: readonly HeatmapClickGroup[]
  clickSampleGroups?: readonly HeatmapClickSampleGroup[]
  anchorDefinitions?: readonly HeatmapClickAnchorDefinition[]
  anchorResolutions?: readonly PreviewAnchorResolution[] | null
  anchorSelection?: ClickAnchorSelection | null
  movementGroups?: readonly HeatmapMovementGroup[]
  scrollPoints?: readonly HeatmapScrollPoint[]
  scrollGroups?: readonly HeatmapScrollGroup[]
  scrollSource?: ScrollOverlayDimensions | null
  heatmapType?: HeatmapOverlayType
  sessionKey: string
  measurement: PreviewMeasurementState | null
}

export function HeatmapOverlayLayer({
  clickGroups,
  clickSampleGroups,
  anchorDefinitions = [],
  anchorResolutions = null,
  anchorSelection = null,
  movementGroups = [],
  scrollGroups,
  scrollSource = null,
  heatmapType = 'click',
  sessionKey,
  measurement,
}: HeatmapOverlayLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scrollReachPercent, setScrollReachPercent] = useState<number | null>(
    null
  )
  const groups = heatmapType === 'movement' ? movementGroups : clickGroups

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let frame = 0
    const draw = () => {
      frame = 0
      const rect = canvas.getBoundingClientRect()
      // Use layout CSS pixels. The canvas may be inside a visually scaled
      // preview stage, while the measurement coordinates remain unscaled.
      const width = Math.max(1, canvas.clientWidth || rect.width)
      const height = Math.max(1, canvas.clientHeight || rect.height)
      const devicePixelRatio = window.devicePixelRatio || 1
      const backingWidth = Math.max(1, Math.round(width * devicePixelRatio))
      const backingHeight = Math.max(1, Math.round(height * devicePixelRatio))

      if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
        canvas.width = backingWidth
        canvas.height = backingHeight
      }

      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
      context.clearRect(0, 0, width, height)

      let compatibleGroups = 0
      let drawnPoints = 0
      const rejectionReasons: Record<string, number> = {}
      setScrollReachPercent(null)
      canvas.dataset.overlayCompatibleGroups = '0'
      canvas.dataset.overlayDrawnPoints = '0'
      canvas.dataset.overlayRejectionReasons = '{}'
      canvas.dataset.overlayRegionCount = '0'
      canvas.dataset.overlayReachPercent = ''
      canvas.dataset.overlayCanvasWidth = String(width)
      canvas.dataset.overlayCanvasHeight = String(height)
      canvas.dataset.overlayLiveViewport = measurement
        ? `${measurement.viewportWidth}x${measurement.viewportHeight}`
        : ''
      canvas.dataset.overlayLiveDocument = measurement
        ? `${measurement.documentWidth}x${measurement.documentHeight}`
        : ''
      canvas.dataset.overlayLiveScroll = measurement
        ? `${measurement.scrollX}x${measurement.scrollY}`
        : ''
      canvas.dataset.overlayType = heatmapType
      canvas.dataset.overlayExpectedBands = '0'
      canvas.dataset.overlaySourceViewport = scrollSource
        ? `${scrollSource.viewport.width}x${scrollSource.viewport.height}`
        : ''
      canvas.dataset.overlaySourceDocument = scrollSource
        ? `${scrollSource.document.width}x${scrollSource.document.height}`
        : ''
      canvas.dataset.overlaySourceProvenance = scrollSource?.provenance ?? ''
      canvas.dataset.overlayMeasurementReady = String(
        Boolean(measurement && measurement.layoutVersion > 0)
      )
      canvas.dataset.overlayAnchoredSamples = '0'
      canvas.dataset.overlayLegacySamples = '0'
      canvas.dataset.overlayUnresolvedAnchorSamples = '0'
      canvas.dataset.overlayMissingAnchorSamples = '0'
      canvas.dataset.overlayAmbiguousAnchorSamples = '0'
      canvas.dataset.overlayOmittedAnchorSamples = String(
        anchorSelection?.omittedAnchorCount ?? 0
      )
      canvas.dataset.overlayGeometryIncompatibleSamples = '0'

      if (!measurement || measurement.layoutVersion <= 0) {
        canvas.dataset.overlayRejectionReasons = JSON.stringify({
          [measurement ? 'layout-not-stable' : 'measurement-unavailable']: 1,
        })
        return
      }

      if (heatmapType === 'scroll') {
        let maximumReachPercent: number | null = null

        if (scrollGroups) {
          for (const group of scrollGroups) {
            const source =
              group.safeForDocumentOverlay &&
              group.alignment === 'document-compatible' &&
              group.sourceViewport &&
              group.sourceDocument
                ? {
                    viewport: group.sourceViewport,
                    document: group.sourceDocument,
                    provenance: 'tracker-group' as const,
                  }
                : null
            const decision = getScrollOverlayDecision(source, measurement)
            if (!decision.compatible) {
              const reason =
                group.alignment === 'geometry-unavailable'
                  ? 'source-dimensions-unavailable'
                  : group.alignment === 'geometry-inconsistent'
                    ? 'source-geometry-inconsistent'
                    : decision.reason
              rejectionReasons[reason] = (rejectionReasons[reason] ?? 0) + 1
              continue
            }
            compatibleGroups += 1
            if (group.maximumReachPercent === null) {
              rejectionReasons['reach-data-unavailable'] =
                (rejectionReasons['reach-data-unavailable'] ?? 0) + 1
              continue
            }
            maximumReachPercent = Math.max(
              maximumReachPercent ?? 0,
              group.maximumReachPercent
            )
          }
        } else {
          rejectionReasons['reach-data-unavailable'] = 1
        }

        if (maximumReachPercent !== null) {
          drawScrollRegions(
            context,
            maximumReachPercent,
            width,
            height,
            measurement
          )
          setScrollReachPercent(maximumReachPercent)
          drawnPoints = 2
        }
        canvas.dataset.overlayCompatibleGroups = String(compatibleGroups)
        canvas.dataset.overlayDrawnPoints = String(drawnPoints)
        canvas.dataset.overlayBandCount = '0'
        canvas.dataset.overlayRegionCount = String(
          maximumReachPercent === null ? 0 : 2
        )
        canvas.dataset.overlayReachPercent =
          maximumReachPercent === null ? '' : String(maximumReachPercent)
        canvas.dataset.overlayRejectionReasons =
          JSON.stringify(rejectionReasons)
        return
      }

      if (heatmapType === 'click' && clickSampleGroups) {
        const definitionMap = new Map(
          anchorDefinitions.map((definition) => [
            definition.anchorId,
            definition,
          ])
        )
        const resolutionMap = new Map(
          (anchorResolutions ?? []).map((resolution) => [
            resolution.anchorId,
            resolution,
          ])
        )
        const density = drawClickDensity(
          context,
          clickSampleGroups,
          measurement,
          width,
          height,
          devicePixelRatio,
          definitionMap,
          resolutionMap,
          anchorSelection
        )
        canvas.dataset.overlayCompatibleGroups = String(
          density.compatibleGroups
        )
        canvas.dataset.overlayDrawnPoints = String(density.drawnPoints)
        canvas.dataset.overlayBandCount = '0'
        canvas.dataset.overlayRejectionReasons = JSON.stringify(
          density.rejectionReasons
        )
        canvas.dataset.overlayAnchoredSamples = String(
          density.diagnostics.anchoredSamples
        )
        canvas.dataset.overlayLegacySamples = String(
          density.diagnostics.legacySamples
        )
        canvas.dataset.overlayUnresolvedAnchorSamples = String(
          density.diagnostics.unresolvedAnchorSamples
        )
        canvas.dataset.overlayMissingAnchorSamples = String(
          density.diagnostics.missingAnchorSamples
        )
        canvas.dataset.overlayAmbiguousAnchorSamples = String(
          density.diagnostics.ambiguousAnchorSamples
        )
        canvas.dataset.overlayOmittedAnchorSamples = String(
          density.diagnostics.omittedAnchorSamples
        )
        canvas.dataset.overlayGeometryIncompatibleSamples = String(
          density.diagnostics.geometryIncompatibleSamples
        )
        return
      }

      for (const group of groups) {
        const decision = getClickGroupOverlayDecision(group, measurement)
        if (!decision.compatible) {
          rejectionReasons[decision.reason] =
            (rejectionReasons[decision.reason] ?? 0) + 1
          continue
        }
        compatibleGroups += 1
        for (const point of group.points) {
          const projection = projectClickPoint(point, measurement, {
            width,
            height,
          })
          if (
            !projection ||
            projection.x < -MAX_HOTSPOT_RADIUS ||
            projection.y < -MAX_HOTSPOT_RADIUS ||
            projection.x > width + MAX_HOTSPOT_RADIUS ||
            projection.y > height + MAX_HOTSPOT_RADIUS
          ) {
            continue
          }
          drawHotspot(context, point, projection, heatmapType)
          drawnPoints += 1
        }
      }
      canvas.dataset.overlayCompatibleGroups = String(compatibleGroups)
      canvas.dataset.overlayDrawnPoints = String(drawnPoints)
      canvas.dataset.overlayBandCount = '0'
      canvas.dataset.overlayRejectionReasons = JSON.stringify(rejectionReasons)
    }

    const scheduleDraw = () => {
      if (frame === 0) frame = window.requestAnimationFrame(draw)
    }
    const resizeObserver = new ResizeObserver(scheduleDraw)
    resizeObserver.observe(canvas)
    scheduleDraw()

    return () => {
      resizeObserver.disconnect()
      if (frame !== 0) window.cancelAnimationFrame(frame)
      const context = canvas.getContext('2d')
      context?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [
    groups,
    clickSampleGroups,
    anchorDefinitions,
    anchorResolutions,
    anchorSelection,
    heatmapType,
    measurement,
    scrollGroups,
    scrollSource,
    sessionKey,
  ])

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        data-overlay-status={measurement ? 'aligned' : 'alignment-pending'}
        data-overlay-type={heatmapType}
        data-overlay-expected-bands={0}
        data-overlay-groups={
          heatmapType === 'scroll'
            ? (scrollGroups?.length ?? 0)
            : heatmapType === 'click'
              ? (clickSampleGroups?.length ?? groups.length)
              : groups.length
        }
        data-overlay-compatible-groups="0"
        data-overlay-drawn-points="0"
        data-overlay-rejection-reasons="{}"
        data-overlay-live-viewport=""
        data-overlay-live-document=""
        data-overlay-live-scroll=""
        data-overlay-anchored-samples="0"
        data-overlay-legacy-samples="0"
        data-overlay-unresolved-anchor-samples="0"
        data-overlay-missing-anchor-samples="0"
        data-overlay-ambiguous-anchor-samples="0"
        data-overlay-omitted-anchor-samples="0"
        data-overlay-geometry-incompatible-samples="0"
        data-overlay-source-viewport=""
        data-overlay-source-document=""
        data-overlay-source-provenance=""
        data-overlay-measurement-ready="false"
        data-overlay-band-count="0"
        data-overlay-region-count="0"
        data-overlay-reach-percent=""
        data-overlay-canvas-width="0"
        data-overlay-canvas-height="0"
      />
      {heatmapType === 'scroll' && scrollReachPercent !== null ? (
        <div
          aria-label={`Scroll reach: ${Math.round(scrollReachPercent)} percent reached, ${Math.round(100 - scrollReachPercent)} percent not reached`}
          className="pointer-events-none absolute top-3 left-3 z-30 rounded-md border bg-black/60 px-2 py-1 text-xs text-white"
          data-scroll-legend
        >
          Reached: {Math.round(scrollReachPercent)}% · Not reached:{' '}
          {Math.round(100 - scrollReachPercent)}%
        </div>
      ) : null}
    </>
  )
}
