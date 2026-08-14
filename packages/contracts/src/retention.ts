export type RetentionInterval = 'day' | 'week'

export interface RetentionCell {
  period: number
  retained: number | null
  rate: number | null
}

export interface RetentionCohort {
  cohortStart: string
  cohortSize: number
  cells: RetentionCell[]
}

export interface RetentionData {
  interval: RetentionInterval
  periods: number
  cohorts: RetentionCohort[]
}

export interface RetentionParams {
  workspace_id: string
  project_id: string
  range: '30d' | '90d'
  interval: RetentionInterval
  periods: number
  device: 'all' | 'desktop' | 'mobile' | 'tablet'
}

export interface RetentionResponse {
  success: boolean
  data: RetentionData
}
