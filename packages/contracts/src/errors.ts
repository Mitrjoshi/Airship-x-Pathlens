export type ErrorsRange = '24h' | '7d' | '30d' | '90d'
export type ErrorsDevice = 'all' | 'desktop' | 'mobile' | 'tablet' | 'unknown'

export interface ErrorBreakdown {
  name: string
  count: number
}

export interface ErrorOccurrence {
  id: string
  type: 'javascript_error' | 'promise_rejection'
  message: string
  stackTrace: string | null
  file: string | null
  line: number | null
  column: number | null
  path: string
  url: string | null
  browser: string
  device: string
  visitorId: string
  sessionId: string
  occurredAt: string
  replayAvailable: boolean
}

export interface ErrorGroup {
  fingerprint: string
  type: 'javascript_error' | 'promise_rejection'
  message: string
  stackTrace: string | null
  errorCount: number
  affectedUsers: number
  affectedSessions: number
  firstSeen: string
  lastSeen: string
  browsers: ErrorBreakdown[]
  devices: ErrorBreakdown[]
  urls: ErrorBreakdown[]
  sample: ErrorOccurrence | null
}

export interface ErrorsData {
  summary: {
    errorCount: number
    affectedUsers: number
    affectedSessions: number
    errorRate: number
  }
  errors: ErrorGroup[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
  }
}

export interface ErrorsResponse {
  success: boolean
  data: ErrorsData
}

export interface ErrorsParams {
  workspace_id: string
  project_id: string
  range: ErrorsRange
  device: ErrorsDevice
  browser?: string
  url?: string
  search?: string
  page: number
  page_size: number
}
