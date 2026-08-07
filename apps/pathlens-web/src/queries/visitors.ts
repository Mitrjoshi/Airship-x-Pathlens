import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'

export type VisitorsRange = '24h' | '7d' | '30d' | '90d'
export type VisitorStatus = 'all' | 'online' | 'offline'

export interface Visitor {
  id: string
  location: string
  countryCode: string
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown'
  browser: string
  sessions: number
  pageViews: number
  duration: string
  status: 'online' | 'offline'
  lastSeen: string
}

export interface VisitorsResponse {
  success: boolean
  data: {
    summary: {
      totalVisitors: number
      newVisitors: number
      returningVisitors: number
      liveVisitors: number
      avgDuration: string
    }
    visitors: Visitor[]
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
      hasNextPage: boolean
    }
  }
}

export interface VisitorsParams {
  workspace_id: string
  project_id: string
  range: VisitorsRange
  status: VisitorStatus
  search?: string
  page: number
  page_size: number
}

const getVisitors = async (
  params: VisitorsParams
): Promise<VisitorsResponse> => {
  const response = await apiClient.get('/visitors', { params })

  return response.data
}

export const getVisitorsOptions = (params: VisitorsParams) =>
  queryOptions({
    queryKey: ['VISITORS', params],
    queryFn: () => getVisitors(params),
    enabled: Boolean(params.workspace_id && params.project_id),
    refetchInterval: 30_000,
  })
