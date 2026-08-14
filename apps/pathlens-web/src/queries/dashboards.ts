import apiClient from '@/lib/apiClient'
import type {
  Dashboard,
  DashboardDevice,
  DashboardRange,
  DashboardSummary,
  DashboardResponse,
  DashboardsResponse,
  RetentionParams,
  RetentionResponse,
} from '@workspace/contracts'
import { queryOptions } from '@tanstack/react-query'

export type { DashboardDevice, DashboardRange }
export type {
  Dashboard,
  DashboardSummary,
  DashboardResponse,
  DashboardsResponse,
}

export interface DashboardScope {
  workspace_id: string
  project_id: string
}

const getDashboards = async (
  params: DashboardScope
): Promise<DashboardsResponse> => {
  const response = await apiClient.get('/dashboards', { params })

  return response.data
}

const getDashboard = async (
  params: DashboardScope & { dashboard_id: string }
): Promise<DashboardResponse> => {
  const { dashboard_id, ...scope } = params
  const response = await apiClient.get(
    `/dashboards/${encodeURIComponent(dashboard_id)}`,
    { params: scope }
  )

  return response.data
}

const getRetention = async (
  params: RetentionParams
): Promise<RetentionResponse> => {
  const response = await apiClient.get('/analytics/retention', { params })

  return response.data
}

export const getDashboardsOptions = (params: DashboardScope) =>
  queryOptions({
    queryKey: ['DASHBOARDS', params],
    queryFn: () => getDashboards(params),
    enabled: Boolean(params.workspace_id && params.project_id),
  })

export const getDashboardOptions = (
  params: DashboardScope & { dashboard_id: string }
) =>
  queryOptions({
    queryKey: ['DASHBOARD', params],
    queryFn: () => getDashboard(params),
    enabled: Boolean(
      params.workspace_id && params.project_id && params.dashboard_id
    ),
  })

export const getRetentionOptions = (params: RetentionParams) =>
  queryOptions({
    queryKey: ['RETENTION', params],
    queryFn: () => getRetention(params),
    enabled: Boolean(params.workspace_id && params.project_id),
  })
