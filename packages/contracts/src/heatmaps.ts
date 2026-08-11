import type { ReplayEvent } from './replay'

export type HeatmapsRange = '24h' | '7d' | '30d' | '90d'

export interface HeatmapPage {
  path: string
  url: string | null
  visitors: number
  views: number
  clicks: number
  scrollEvents: number
  maxScroll: number
  averageScroll: number
  viewport: {
    width: number
    height: number
  } | null
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

export interface HeatmapPageDetail extends HeatmapPage {
  clickPoints: HeatmapClickPoint[]
  scrollPoints: HeatmapScrollPoint[]
  replayEvents: ReplayEvent[]
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
  page_path?: string
}
