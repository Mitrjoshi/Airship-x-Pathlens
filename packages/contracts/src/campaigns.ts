export type CampaignRange = '24h' | '7d' | '30d' | '90d'
export type CampaignDevice = 'all' | 'desktop' | 'mobile' | 'tablet' | 'unknown'
export type CampaignGoalType =
  'event' | 'revenue' | 'pageview' | 'button' | 'form_submit'

export interface CampaignGoalOption {
  id: string
  name: string
  type: CampaignGoalType
  unit: string
}

export interface CampaignRow {
  key: string
  isUnattributed: boolean
  utmSource: string | null
  utmMedium: string | null
  utmCampaign: string | null
  utmTerm: string | null
  utmContent: string | null
  visitors: number
  sessions: number
  engagedVisitors: number
  engagedSessions: number
  engagementRate: number
  convertedVisitors: number | null
  conversionRate: number | null
  revenue: number | null
}

export interface CampaignSummary {
  campaignCount: number
  visitors: number
  sessions: number
  engagedVisitors: number
  engagedSessions: number
  engagementRate: number
  convertedVisitors: number | null
  conversionRate: number | null
  revenue: number | null
}

export interface CampaignAnalyticsData {
  goals: CampaignGoalOption[]
  selectedGoal: CampaignGoalOption | null
  summary: CampaignSummary
  campaigns: CampaignRow[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
  }
}

export interface CampaignAnalyticsResponse {
  success: boolean
  data: CampaignAnalyticsData
}

export interface CampaignAnalyticsParams {
  workspace_id: string
  project_id: string
  range: CampaignRange
  device: CampaignDevice
  goal_id?: string
  page: number
  page_size: number
}
