export type EventsRange = '24h' | '7d' | '30d' | '90d'
export type EventsCategory = 'high_signal' | 'all' | 'actions' | 'forms'
export type EventsDevice = 'all' | 'desktop' | 'mobile' | 'tablet' | 'unknown'
export type ProjectEventCategory =
  | 'action'
  | 'form'
  | 'navigation'
  | 'error'
  | 'performance'
  | 'custom'
  | 'system'

export type ProjectEventDetailValue = string | number | boolean | null

export interface ProjectEvent {
  id: string
  type: string
  category: ProjectEventCategory
  description: string
  sessionId: string
  path: string
  url: string | null
  title: string | null
  referrer: string | null
  referrerDomain: string | null
  visitorId: string
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown'
  country: string
  countryCode: string
  browser: string | null
  browserVersion: string | null
  os: string | null
  osVersion: string | null
  tag: string | null
  text: string | null
  details: Record<string, ProjectEventDetailValue>
  replayAvailable: boolean
  occurredAt: string
}

export interface EventsData {
  events: ProjectEvent[]
  summary: {
    totalEvents: number
    totalSessions: number
    totalVisitors: number
    highSignalActions: number
  }
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
  }
}

export interface EventsResponse {
  success: boolean
  data: EventsData
}

export interface EventsParams {
  workspace_id: string
  project_id: string
  range: EventsRange
  category: EventsCategory
  device: EventsDevice
  path?: string
  search?: string
  page: number
  page_size: number
}
