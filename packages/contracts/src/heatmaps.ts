import type { ReplayEvent } from './replay'

export type HeatmapsRange = '24h' | '7d' | '30d' | '90d'
export type HeatmapDevice = 'all' | 'desktop' | 'mobile' | 'tablet'
export type HeatmapSnapshotStatus =
  'pending' | 'processing' | 'ready' | 'stale' | 'failed'
export type HeatmapCoordinateMode = 'document' | 'viewport'

export interface HeatmapPage {
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

export interface HeatmapScrollPoint {
  percentage: number
  count: number
  intensity: number
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
  hotAreas: HeatmapHotArea[]
  scrollPoints: HeatmapScrollPoint[]
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
  refetchInterval?: number
}

export interface HeatmapDetailsParams {
  workspace_id: string
  project_id: string
  domain?: string
  range: HeatmapsRange
  device?: HeatmapDevice
  page_path: string | null
}
