import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'

export type SessionReplayRange = '24h' | '7d' | '30d' | '90d'
export type SessionReplayDevice = 'all' | 'desktop' | 'mobile' | 'tablet'

export interface SessionReplaySession {
  id: string
  visitorId: string
  country: string
  countryCode: string
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown'
  duration: string
  pages: number
  source: string
  recordedAt: string
  eventCount: number
}

export interface SessionReplayResponse {
  success: boolean
  data: {
    stats: {
      recordedSessions: number
      replayAvailable: number
      avgSession: string
      storageUsed: string
    }
    sessions: SessionReplaySession[]
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
      hasNextPage: boolean
    }
  }
}

export interface SessionReplayEvent {
  id: string
  type: string
  occurredAt: string
  elapsedMs: number
  path: string | null
  url: string | null
  title: string | null
  payload: Record<string, unknown>
}

export interface SessionReplayDetail {
  id: string
  visitorId: string
  country: string
  countryCode: string
  device: 'Desktop' | 'Mobile' | 'Tablet' | 'Unknown'
  duration: string
  startedAt: string
  endedAt: string
  screen: {
    width: number
    height: number
  } | null
  viewport: {
    width: number
    height: number
  } | null
  totalEvents: number
  hasMoreEvents: boolean
  events: SessionReplayEvent[]
}

export interface SessionReplayDetailResponse {
  success: boolean
  data: SessionReplayDetail
}

export interface SessionReplayParams {
  workspace_id: string
  project_id: string
  range: SessionReplayRange
  device: SessionReplayDevice
  search?: string
  page: number
  page_size: number
}

export interface SessionReplayDetailParams {
  workspace_id: string
  project_id: string
  session_id: string
}

const getSessionReplay = async (
  params: SessionReplayParams
): Promise<SessionReplayResponse> => {
  const response = await apiClient.get('/session-replay', { params })

  return response.data
}

export const getSessionReplayOptions = (params: SessionReplayParams) =>
  queryOptions({
    queryKey: ['SESSION_REPLAY', params],
    queryFn: () => getSessionReplay(params),
    enabled: Boolean(params.workspace_id && params.project_id),
    refetchInterval: 30_000,
  })

const getSessionReplayDetail = async (
  params: SessionReplayDetailParams
): Promise<SessionReplayDetailResponse> => {
  const response = await apiClient.get(
    `/session-replay/${encodeURIComponent(params.session_id)}`,
    {
      params: {
        workspace_id: params.workspace_id,
        project_id: params.project_id,
      },
    }
  )

  return response.data
}

export const getSessionReplayDetailOptions = (
  params: SessionReplayDetailParams
) =>
  queryOptions({
    queryKey: ['SESSION_REPLAY_DETAIL', params],
    queryFn: () => getSessionReplayDetail(params),
    enabled: Boolean(
      params.workspace_id && params.project_id && params.session_id
    ),
  })
