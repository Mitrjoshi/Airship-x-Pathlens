import apiClient from '@/lib/apiClient'
import type {
  DashboardCreatePayload,
  DashboardUpdatePayload,
  DashboardWidgetCreatePayload,
  DashboardWidgetUpdatePayload,
} from '@workspace/contracts'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface DashboardMutationResponse {
  success: boolean
  message?: string
  data?: {
    id: string
  }
}

interface DashboardMutationScope {
  workspace_id: string
  project_id: string
}

const createDashboard = async (payload: DashboardCreatePayload) => {
  const response = await apiClient.post<DashboardMutationResponse>(
    '/dashboards',
    payload
  )

  return response.data
}

const updateDashboard = async ({
  id,
  payload,
}: {
  id: string
  payload: DashboardUpdatePayload
}) => {
  const response = await apiClient.patch<DashboardMutationResponse>(
    `/dashboards/${encodeURIComponent(id)}`,
    payload
  )

  return response.data
}

const deleteDashboard = async ({
  id,
  workspace_id,
  project_id,
}: DashboardMutationScope & { id: string }) => {
  const response = await apiClient.delete<DashboardMutationResponse>(
    `/dashboards/${encodeURIComponent(id)}`,
    { params: { workspace_id, project_id } }
  )

  return response.data
}

const createWidget = async ({
  dashboardId,
  payload,
}: {
  dashboardId: string
  payload: DashboardWidgetCreatePayload
}) => {
  const response = await apiClient.post<DashboardMutationResponse>(
    `/dashboards/${encodeURIComponent(dashboardId)}/widgets`,
    payload
  )

  return response.data
}

const updateWidget = async ({
  dashboardId,
  widgetId,
  payload,
}: {
  dashboardId: string
  widgetId: string
  payload: DashboardWidgetUpdatePayload
}) => {
  const response = await apiClient.patch<DashboardMutationResponse>(
    `/dashboards/${encodeURIComponent(dashboardId)}/widgets/${encodeURIComponent(widgetId)}`,
    payload
  )

  return response.data
}

const deleteWidget = async ({
  dashboardId,
  widgetId,
  workspace_id,
  project_id,
}: DashboardMutationScope & { dashboardId: string; widgetId: string }) => {
  const response = await apiClient.delete<DashboardMutationResponse>(
    `/dashboards/${encodeURIComponent(dashboardId)}/widgets/${encodeURIComponent(widgetId)}`,
    { params: { workspace_id, project_id } }
  )

  return response.data
}

function invalidateDashboards(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: ['DASHBOARDS'] })
}

function invalidateDashboard(
  queryClient: ReturnType<typeof useQueryClient>,
  dashboardId: string
) {
  return queryClient.invalidateQueries({
    queryKey: ['DASHBOARD'],
    predicate: (query) => {
      const params = query.queryKey[1] as { dashboard_id?: string } | undefined

      return params?.dashboard_id === dashboardId
    },
  })
}

export function useCreateDashboard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDashboard,
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to create dashboard.')
      }

      await invalidateDashboards(queryClient)
      toast.success('Dashboard created.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateDashboard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDashboard,
    onSuccess: async (data, variables) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to update dashboard.')
      }

      await Promise.all([
        invalidateDashboards(queryClient),
        invalidateDashboard(queryClient, variables.id),
      ])
      toast.success('Dashboard updated.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteDashboard() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDashboard,
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to delete dashboard.')
      }

      await invalidateDashboards(queryClient)
      toast.success('Dashboard deleted.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useCreateDashboardWidget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWidget,
    onSuccess: async (data, variables) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to add widget.')
      }

      await Promise.all([
        invalidateDashboards(queryClient),
        invalidateDashboard(queryClient, variables.dashboardId),
      ])
      toast.success('Widget added.')
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useUpdateDashboardWidget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateWidget,
    onSuccess: async (data, variables) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to update widget.')
      }

      await invalidateDashboard(queryClient, variables.dashboardId)
    },
    onError: (error) => toast.error(error.message),
  })
}

export function useDeleteDashboardWidget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWidget,
    onSuccess: async (data, variables) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to remove widget.')
      }

      await Promise.all([
        invalidateDashboards(queryClient),
        invalidateDashboard(queryClient, variables.dashboardId),
      ])
      toast.success('Widget removed.')
    },
    onError: (error) => toast.error(error.message),
  })
}
