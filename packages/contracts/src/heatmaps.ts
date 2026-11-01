import type { ReplayEvent } from './replay'
import type {
  ClickElementRect,
  ClickElementScrollAncestor,
  ClickElementStickyInset,
  ClickElementPositionMode,
} from './element-anchor'
import type { ClickRegionAnchor, RegionAnchorKind } from './region-anchor'

export type HeatmapsRange = '24h' | '7d' | '30d' | '90d'
export type HeatmapDevice = 'all' | 'desktop' | 'mobile' | 'tablet' | 'unknown'
export type HeatmapSnapshotStatus =
  'pending' | 'processing' | 'ready' | 'stale' | 'failed'
export type HeatmapCoordinateMode = 'document' | 'viewport'
export type HeatmapCoordinateAlignment =
  'document-compatible' | 'viewport-only' | 'legacy-unknown'

export interface HeatmapSourceDimensions {
  width: number
  height: number
}

export interface HeatmapCoordinateGroup {
  groupId: string
  coordinateSchemaVersion: number | null
  coordinateMode: HeatmapCoordinateMode
  sourceViewport: HeatmapSourceDimensions | null
  sourceDocument: HeatmapSourceDimensions | null
  sampleCount: number
  alignment: HeatmapCoordinateAlignment
  safeForDocumentOverlay: boolean
}

export interface HeatmapPage {
  id: string
  path: string
  url: string | null
  visitors: number
  views: number
  clicks: number
  scrollEvents: number
  maxScroll: number
  averageScroll: number
  reach25: number
  reach50: number
  reach75: number
  reach100: number
  viewport: {
    width: number
    height: number
  } | null
  replayAvailable: boolean
}

export interface HeatmapClickPoint {
  x: number
  y: number
  count: number
  intensity: number
  coordinateMode: HeatmapCoordinateMode
}

export interface HeatmapClickGroup extends HeatmapCoordinateGroup {
  points: HeatmapClickPoint[]
}

export interface HeatmapClickSample {
  x: number
  y: number
  weight: number
  coordinateMode: HeatmapCoordinateMode
  anchorId?: string
  relativeX?: number
  relativeY?: number
  capturedRect?: ClickElementRect
  regionAnchor?: ClickRegionAnchor
}

export interface HeatmapClickAnchorDefinition {
  anchorId: string
  positionMode: ClickElementPositionMode
  effectivePositionMode?: ClickElementPositionMode
  positioningAncestorDepth?: number
  positioningAncestorAnchorId?: string
  transformedAncestor: boolean
  stickyInset?: ClickElementStickyInset
  scrollAncestors: ClickElementScrollAncestor[]
}

export interface HeatmapClickRegionDefinition {
  regionId: string
  schemaVersion: 1
  regionKind?: RegionAnchorKind
  structuralFingerprint?: string
}

export interface HeatmapClickSampleGroup extends HeatmapCoordinateGroup {
  samples: HeatmapClickSample[]
}

export interface HeatmapClickSampleCoverage {
  limit: number
  totalEvents: number
  returnedEvents: number
  eligibleEvents: number
  truncated: boolean
  anchorCapableEvents?: number
  legacyEvents?: number
  missingAnchorEvents?: number
  invalidAnchorEvents?: number
  uniqueAnchors?: number
  conflictingAnchorIdentities?: number
  anchorDefinitionsReturned?: number
  anchorDefinitionsTruncated?: boolean
  anchorMetadataBytes?: number
}

export interface HeatmapMovementCoverage {
  limit: number
  totalEvents: number
  returnedEvents: number
  eligibleEvents: number
  truncated: boolean
}

export interface HeatmapMovementPoint {
  x: number
  y: number
  count: number
  intensity: number
  coordinateMode: HeatmapCoordinateMode
}

export interface HeatmapMovementGroup extends HeatmapCoordinateGroup {
  points: HeatmapMovementPoint[]
}

export interface HeatmapScrollPoint {
  percentage: number
  count: number
  intensity: number
}

export interface HeatmapScrollGroup {
  groupId: string
  device: Exclude<HeatmapDevice, 'all'>
  coordinateSchemaVersion: number | null
  sourceViewport: HeatmapSourceDimensions | null
  sourceDocument: HeatmapSourceDimensions | null
  sessionCount: number
  maximumReachPercent: number | null
  coordinateMode: 'document'
  alignment:
    'document-compatible' | 'geometry-unavailable' | 'geometry-inconsistent'
  safeForDocumentOverlay: boolean
  reachPoints: HeatmapScrollPoint[]
}

export interface HeatmapHotArea {
  key: string
  label: string
  tag?: string
  count: number
  percentage: number
  intensity: number
  x?: number
  y?: number
}

export interface HeatmapPageDetail extends HeatmapPage {
  clickPoints: HeatmapClickPoint[]
  clickGroups?: HeatmapClickGroup[]
  clickSamples?: HeatmapClickSampleGroup[]
  anchorDefinitions?: HeatmapClickAnchorDefinition[]
  regionDefinitions?: HeatmapClickRegionDefinition[]
  clickSampleCoverage?: HeatmapClickSampleCoverage
  movementPoints?: HeatmapMovementPoint[]
  movementGroups?: HeatmapMovementGroup[]
  movementCoordinateMode?: HeatmapCoordinateMode | 'mixed'
  movementCoverage?: HeatmapMovementCoverage
  hotAreas: HeatmapHotArea[]
  scrollPoints: HeatmapScrollPoint[]
  scrollGroups?: HeatmapScrollGroup[]
  replayEvents: ReplayEvent[]
  replayViewport: {
    width: number
    height: number
  } | null
  coordinateMode: 'document' | 'viewport' | 'mixed'
  screenshotUrl: string | null
  screenshotStatus: 'pending' | 'processing' | 'ready' | 'stale' | 'failed'
  screenshotCapturedAt: string | null
  screenshotWidth: number | null
  screenshotHeight: number | null
  snapshot: HeatmapSnapshot | null
}

export interface HeatmapSnapshot {
  id: string
  pathname: string
  domain: string
  device: HeatmapDevice
  viewportWidth: number
  viewportHeight: number
  pageWidth: number | null
  pageHeight: number | null
  deviceScaleFactor: number
  capturedAt: string | null
}

export function mapHeatmapPointToSnapshot(
  point: Pick<HeatmapClickPoint, 'x' | 'y' | 'coordinateMode'>,
  width: number,
  height: number
): { x: number; y: number } | null {
  if (point.coordinateMode !== 'document') return null
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null

  return {
    x: point.x * width,
    y: point.y * height,
  }
}

export interface HeatmapsPagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
}

export interface HeatmapsListData {
  pages: HeatmapPage[]
  pagination: HeatmapsPagination
}

export interface HeatmapsListResponse {
  success: boolean
  data: HeatmapsListData
}

export interface HeatmapDetailsResponse {
  success: boolean
  data: HeatmapPageDetail | null
}

export interface HeatmapsData {
  pages: HeatmapPage[]
  selectedPage: HeatmapPageDetail | null
  pagination: HeatmapsPagination
}

export interface HeatmapsResponse {
  success: boolean
  data: HeatmapsData
}

export interface HeatmapsParams {
  workspace_id: string
  project_id: string
  domain?: string
  range: HeatmapsRange
  device?: HeatmapDevice
  page_path?: string
  page?: number
  page_size?: number
}

export interface HeatmapDetailsParams {
  workspace_id: string
  project_id: string
  domain?: string
  range: HeatmapsRange
  device?: HeatmapDevice
  page_path?: string | null
  heatmap_id?: string
}
