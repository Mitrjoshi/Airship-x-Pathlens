import apiClient from '@/lib/apiClient'
import type { ReplayEvent } from '@workspace/contracts'
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
  isReplayAvailable: boolean
  isLive: boolean
}

export interface SessionReplayResponse {
  success: boolean
  data: {
    stats: {
      recordedSessions: number
      replayAvailable: number
      liveSessions: number
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
  replay: {
    available: boolean
    events: ReplayEvent[]
    hasMoreEvents: boolean
    lastSequence: number
    isLive: boolean
  }
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

export interface SessionReplayChunkUpdate {
  sequence: number
  events: ReplayEvent[]
  isFinal: boolean
}

export interface SessionReplayStreamHandlers {
  onChunk: (update: SessionReplayChunkUpdate) => void
  onReady: (data: { sequence: number; isLive: boolean }) => void
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
    refetchInterval: 5_000,
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

export async function streamSessionReplay(
  params: SessionReplayDetailParams,
  since: number,
  handlers: SessionReplayStreamHandlers,
  signal: AbortSignal
): Promise<void> {
  const url = apiClient.getUri({
    url: `/session-replay/${encodeURIComponent(params.session_id)}/stream`,
    params: {
      workspace_id: params.workspace_id,
      project_id: params.project_id,
      since,
    },
  })
  const token = localStorage.getItem('pathlens-token')
  const response = await fetch(url, {
    headers: {
      'x-api-key': import.meta.env.VITE_API_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  })

  if (!response.ok) {
    throw new Error('Unable to connect to the replay stream.')
  }

  if (!response.body) {
    throw new Error('Replay streaming is not supported by this browser.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const messages = buffer.split('\n\n')
    buffer = messages.pop() ?? ''

    for (const message of messages) {
      let event = 'message'
      let data = ''

      for (const line of message.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim()
        if (line.startsWith('data:')) data += line.slice(5).trim()
      }

      if (!data) continue

      const parsed = JSON.parse(data) as
        SessionReplayChunkUpdate | { sequence: number; isLive: boolean }

      if (event === 'chunk') {
        handlers.onChunk(parsed as SessionReplayChunkUpdate)
      } else if (event === 'ready') {
        handlers.onReady(parsed as { sequence: number; isLive: boolean })
      }
    }
  }
}
