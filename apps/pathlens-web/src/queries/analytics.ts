export type AnalyticsRange = '24h' | '7d' | '30d' | '90d'
export type AnalyticsDevice = 'all' | 'desktop' | 'mobile' | 'tablet'

export type T_Analytics = {
  summary: {
    visitors: number
    sessions: number
    pageViews: number
    bounceRate: number
    avgDuration: string
  }
  traffic: {
    day: string
    visitors: number
    sessions: number
  }[]
  devices: {
    name: string
    value: number
  }[]
  referrers: {
    name: string
    visitors: number
  }[]
  countries: {
    name: string
    code: string
    visitors: number
  }[]
  browsers: {
    name: string
    visitors: number
  }[]
  pages: {
    page: string | null
    views: number
    duration: string
  }[]
  visitorBreakdown: {
    new: number
    returning: number
  }
}

export interface AnalyticsResponse {
  success: boolean
  data: T_Analytics
}

export interface AnalyticsParams {
  workspace_id: string
  project_id?: string
  domain?: string
  range: AnalyticsRange
  device: AnalyticsDevice
}
