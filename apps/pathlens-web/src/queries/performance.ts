import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'

export type PerformanceRange = '24h' | '7d' | '30d' | '90d'
export type PerformanceDevice = 'all' | 'desktop' | 'mobile' | 'tablet'

export type T_Performance = {
  summary: {
    avgTtfb: number
    avgDomLoaded: number
    avgLoad: number
    avgDns: number
    avgTcp: number
    p75Ttfb: number
    p75DomLoaded: number
    p75Load: number
    totalSamples: number
  }
  trend: {
    day: string
    ttfb: number
    domLoaded: number
    load: number
  }[]
  pages: {
    path: string
    samples: number
    avgTtfb: number
    avgDomLoaded: number
    avgLoad: number
  }[]
  browsers: {
    name: string
    avgTtfb: number
    avgLoad: number
    samples: number
  }[]
  devices: {
    name: string
    avgTtfb: number
    avgLoad: number
    samples: number
  }[]
}

export interface PerformanceResponse {
  success: boolean
  data: T_Performance
}

export interface PerformanceParams {
  workspace_id: string
  project_id?: string
  range: PerformanceRange
  device: PerformanceDevice
}

const getPerformance = async (
  params: PerformanceParams
): Promise<PerformanceResponse> => {
  const response = await apiClient.get('/performance', { params })
  return response.data
}

export const getPerformanceOptions = (params: PerformanceParams) =>
  queryOptions({
    queryKey: ['PERFORMANCE', params],
    queryFn: () => getPerformance(params),
    enabled: !!params.workspace_id,
  })
