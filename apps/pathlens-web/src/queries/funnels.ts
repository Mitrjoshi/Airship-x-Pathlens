import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'

export type FunnelRange = '24h' | '7d' | '30d' | '90d'

export interface FunnelStep {
  name: string
  target: string
  visitors: number
}

export interface Funnel {
  id: string
  name: string
  description: string
  conversionRate: number
  trend: 'up' | 'down' | 'flat'
  trendValue: string
  steps: FunnelStep[]
  createdAt: string
  updatedAt: string
}

export interface FunnelsParams {
  workspace_id: string
  project_id: string
  range: FunnelRange
}

export interface FunnelPayload {
  workspace_id: string
  project_id: string
  name: string
  description: string | null
  steps: {
    name: string
    target: string
  }[]
}

export interface FunnelsResponse {
  success: boolean
  data: Funnel[]
}

const getFunnels = async (params: FunnelsParams): Promise<FunnelsResponse> => {
  const response = await apiClient.get('/funnels', { params })

  return response.data
}

export const getFunnelsOptions = (params: FunnelsParams) =>
  queryOptions({
    queryKey: ['FUNNELS', params],
    queryFn: () => getFunnels(params),
    enabled: Boolean(params.workspace_id && params.project_id),
  })
