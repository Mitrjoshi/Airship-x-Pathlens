import { queryOptions } from '@tanstack/react-query'

import apiClient from '@/lib/apiClient'

export type ReportType =
  | 'full'
  | 'overview'
  | 'traffic'
  | 'pages'
  | 'devices'
  | 'referrers'
  | 'countries'
  | 'browsers'

export type ReportRange = '24h' | '7d' | '30d' | '90d'
export type ReportDevice = 'all' | 'desktop' | 'mobile' | 'tablet'

export interface ReportFilters {
  workspace_id: string
  project_id?: string
  range: ReportRange
  device: ReportDevice
  domain?: string
}

export interface ReportGeneration {
  id: string
  workspaceId: string
  projectId: string | null
  actorUserId: string
  reportType: ReportType
  filters: Omit<ReportFilters, 'workspace_id' | 'project_id'> & {
    project_id?: string
  }
  status: 'completed' | 'failed'
  fileName: string | null
  fileSize: number | null
  downloadUrl?: string | null
  error: string | null
  createdAt: string
  completedAt: string | null
}

export interface ReportGenerationsParams {
  workspace_id: string
  project_id?: string
  page?: number
  page_size?: number
}

export interface ReportGenerationsResponse {
  success: boolean
  data: ReportGeneration[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
  }
}

export interface ReportDownloadResponse {
  success: boolean
  data: {
    id: string
    downloadUrl: string
    expiresAt: string
  }
}

export const getReportGenerationsOptions = (params: ReportGenerationsParams) =>
  queryOptions({
    queryKey: ['REPORT_GENERATIONS', params],
    queryFn: async (): Promise<ReportGenerationsResponse> => {
      const { workspace_id, ...query } = params
      const response = await apiClient.get('/analytics/reports', {
        params: { workspace_id, ...query },
      })

      return response.data
    },
    enabled: Boolean(params.workspace_id),
  })

export const getReportDownloadOptions = (params: {
  reportId: string
  workspace_id: string
}) =>
  queryOptions({
    queryKey: ['REPORT_DOWNLOAD', params],
    queryFn: async (): Promise<ReportDownloadResponse> => {
      const response = await apiClient.get(
        `/analytics/reports/${encodeURIComponent(params.reportId)}/download`,
        { params: { workspace_id: params.workspace_id } }
      )

      return response.data
    },
    enabled: Boolean(params.reportId && params.workspace_id),
  })
