export type UserJourneyRange = '24h' | '7d' | '30d' | '90d'
export type UserJourneyDevice = 'all' | 'desktop' | 'mobile' | 'tablet'

export type UserJourneyNodeType =
  'entry' | 'page' | 'action' | 'conversion' | 'dropoff'

export type UserJourneyEdgeSegment = 'shared' | 'conversion' | 'dropoff'

export interface UserJourneyNode {
  id: string
  title: string
  subtitle: string
  type: UserJourneyNodeType
  depth: number
  visitors: number
  rate: number
  averageTime: string
  description: string
}

export interface UserJourneyEdge {
  id: string
  from: string
  to: string
  visitors: number
  rate: number
  segment: UserJourneyEdgeSegment
}

export interface UserJourneyData {
  summary: {
    visitors: number
    activeBranches: number
    conversionBranches: number
    dropoffBranches: number
    conversionRate: number
    avgTimeToConvert: string
  }
  nodes: UserJourneyNode[]
  edges: UserJourneyEdge[]
}

export interface UserJourneyResponse {
  success: boolean
  data: UserJourneyData
}

export interface UserJourneyParams {
  workspace_id: string
  project_id: string
  range: UserJourneyRange
  device: UserJourneyDevice
}
