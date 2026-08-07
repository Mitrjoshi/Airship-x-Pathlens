import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'

export type AnalyticsRange = '24h' | '7d' | '30d' | '90d'
export type AnalyticsDevice = 'all' | 'desktop' | 'mobile' | 'tablet'

export type T_Analytics = {
  summary: {
    visitors: number
    sessions: number
    bounceRate: number
    avgDuration: string
  }
  traffic: {
    day: string
    visitors: number
    sessions: number
  }[]
  devices: {
    name: string
    value: number
  }[]
  referrers: {
    name: string
    visitors: number
  }[]
  countries: {
    name: string
    code: string
    visitors: number
  }[]
  browsers: {
    name: string
    visitors: number
  }[]
}

export interface AnalyticsResponse {
  success: boolean
  data: T_Analytics
}

export interface AnalyticsParams {
  workspace_id: string
  project_id?: string
  range: AnalyticsRange
  device: AnalyticsDevice
}

const getAnalytics = async (
  params: AnalyticsParams
): Promise<AnalyticsResponse> => {
  const response = await apiClient.get('/analytics', { params })

  return response.data
}

export const getAnalyticsOptions = (params: AnalyticsParams) =>
  queryOptions({
    queryKey: ['ANALYTICS', params],
    queryFn: () => getAnalytics(params),
    enabled: !!params.workspace_id,
  })
