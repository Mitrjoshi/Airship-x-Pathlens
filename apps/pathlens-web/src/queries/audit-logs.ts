import { queryOptions } from '@tanstack/react-query'

import apiClient from '@/lib/apiClient'

export interface AuditLogsParams {
  workspace_id: string
  project_id?: string
  page?: number
  page_size?: number
  action?: string
  resource_type?: string
  actor_user_id?: string
  search?: string
}

export interface AuditLog {
  id: string
  workspaceId: string
  actor: {
    id: string
    name: string
    email: string
  }
  action: string
  resourceType: string
  resourceId: string | null
  metadata: AuditLogMetadata | null
  createdAt: string
}

export interface AuditLogMetadata {
  projectId?: string
  name?: string | null
  description?: string | null
  domain?: string | null
  type?: string
  target?: number
  unit?: string
  matchTarget?: string
  matchPath?: string | null
  deadline?: string | null
  steps?: unknown[]
  captureReplay?: boolean
  capturePerformance?: boolean
  captureErrors?: boolean
  userId?: string
  role?: string
  permissionProfileId?: string | null
  notificationId?: string
  recipientUserId?: string
  recipientEmail?: string
  permissions?: string[]
  [key: string]: unknown
}

export interface AuditLogsResponse {
  success: boolean
  data: AuditLog[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNextPage: boolean
  }
}

export const getAuditLogsOptions = (params: AuditLogsParams) =>
  queryOptions({
    queryKey: ['AUDIT_LOGS', params],
    queryFn: async (): Promise<AuditLogsResponse> => {
      const { workspace_id, ...query } = params
      const response = await apiClient.get(
        `/workspaces/${workspace_id}/audit-logs`,
        { params: query }
      )

      return response.data
    },
    enabled: Boolean(params.workspace_id),
  })
