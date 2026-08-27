import type { ReplayEvent } from './replay'

export type HeatmapsRange = '24h' | '7d' | '30d' | '90d'
export type HeatmapDevice = 'all' | 'desktop' | 'mobile' | 'tablet'

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
}

export interface HeatmapsData {
  pages: HeatmapPage[]
  selectedPage: HeatmapPageDetail | null
}

export interface HeatmapsResponse {
  success: boolean
  data: HeatmapsData
}

export interface HeatmapsParams {
  workspace_id: string
  project_id: string
  range: HeatmapsRange
  device?: HeatmapDevice
  page_path?: string
}
