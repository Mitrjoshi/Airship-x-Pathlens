export type EventsRange = '24h' | '7d' | '30d' | '90d'

export interface ProjectEvent {
  id: string
  type: string
  path: string
  visitorId: string
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown'
  country: string
  tag: string | null
  text: string | null
  occurredAt: string
}

export interface EventsData {
  events: ProjectEvent[]
  summary: {
    totalEvents: number
    totalSessions: number
    totalVisitors: number
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
  search?: string
  page: number
  page_size: number
}
