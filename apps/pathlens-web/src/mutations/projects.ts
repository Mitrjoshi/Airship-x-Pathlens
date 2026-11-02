import apiClient from '@/lib/apiClient'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

interface CreateProjectPayload {
  name: string
  description: string | null
  domain: string
  workspace_id: string
  captureReplay: boolean
  capturePerformance: boolean
  captureErrors: boolean
}

interface CreateProjectResponse {
  success: boolean
  message: string
  data: {
    id: string
  }
}

const createProject = async (payload: CreateProjectPayload) => {
  const res = await apiClient.post<CreateProjectResponse>(
    '/projects/create',
    payload
  )
  return res.data
}

export const useCreateProject = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => createProject(payload),
    onSuccess: async (data, variables) => {
      if (!data.success) throw new Error(data.message)
      await queryClient.invalidateQueries({ queryKey: ['WORKSPACES'] })
      await queryClient.invalidateQueries({ queryKey: ['PROJECTS'] })
      navigate({
        to: '/app/$workspaceId/$projectId/setup',
        replace: true,
        params: {
          projectId: data.data.id,
          workspaceId: variables.workspace_id,
        },
      })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

interface UpdateProjectPayload {
  name: string
  description: string | null
  domain: string | null
  domains?: string[]
  captureReplay: boolean
  capturePerformance: boolean
  captureErrors: boolean
}

interface UpdateProjectResponse {
  success: boolean
  message?: string
  data?: {
    id: string
    name: string
    description: string | null
    domain: string | null
    domains: string[]
    captureReplay: boolean
    capturePerformance: boolean
    captureErrors: boolean
  }
}

export const useUpdateProject = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      payload: UpdateProjectPayload
    ): Promise<UpdateProjectResponse> => {
      const response = await apiClient.patch<UpdateProjectResponse>(
        `/projects/${projectId}`,
        payload
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to save project settings.')
      }

      await queryClient.invalidateQueries({ queryKey: ['PROJECTS'] })
      toast.success('Project settings saved.')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

interface PauseProjectResponse {
  success: boolean
  message?: string
  data?: {
    projectId: string
    disabledCount: number
  }
}

export const usePauseProject = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<PauseProjectResponse> => {
      const response = await apiClient.post<PauseProjectResponse>(
        `/projects/${projectId}/pause`
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to pause project.')
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['PROJECTS'] }),
        queryClient.invalidateQueries({
          queryKey: ['PROJECT_API_KEYS', projectId],
        }),
      ])
      toast.success('Project paused.')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

interface ResumeProjectResponse {
  success: boolean
  message?: string
  data?: {
    projectId: string
    enabledCount: number
  }
}

export const useResumeProject = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<ResumeProjectResponse> => {
      const response = await apiClient.post<ResumeProjectResponse>(
        `/projects/${projectId}/resume`
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to resume project.')
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['PROJECTS'] }),
        queryClient.invalidateQueries({
          queryKey: ['PROJECT_API_KEYS', projectId],
        }),
      ])
      toast.success('Project resumed.')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

interface ResetProjectAnalyticsResponse {
  success: boolean
  message?: string
  data?: {
    projectId: string
    events: number
    replaySessions: number
    visitorCampaignAttribution: number
    heatmapPageSnapshots: number
    reports: number
  }
}

export const useResetProjectAnalytics = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<ResetProjectAnalyticsResponse> => {
      const response = await apiClient.post<ResetProjectAnalyticsResponse>(
        `/projects/${projectId}/reset`
      )

      return response.data
    },
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to reset project analytics.')
      }

      await Promise.all(
        [
          'PROJECTS',
          'ANALYTICS',
          'DASHBOARD',
          'EVENTS',
          'EVENTS_CHART',
          'VISITORS',
          'VISITOR_LOCATIONS',
          'SESSION_REPLAY',
          'SESSION_REPLAY_DETAIL',
          'USER_JOURNEY',
          'ERRORS',
          'PERFORMANCE',
          'HEATMAPS',
          'HEATMAP_DETAILS',
          'REPORT_GENERATIONS',
          'REPORT_DOWNLOAD',
          'WORKSPACE_USAGE',
        ].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey: [queryKey] })
        )
      )
      toast.success('Project analytics reset.')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}

interface DeleteProjectPayload {
  project_id: string
  workspace_id: string
}

const deleteProject = async (payload: DeleteProjectPayload) => {
  const res = await apiClient.delete<CreateProjectResponse>(
    `/projects/delete/${payload.project_id}`
  )
  return res.data
}

export const useDeleteProject = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: DeleteProjectPayload) => deleteProject(payload),
    onSuccess: async (data, variables) => {
      if (!data.success) throw new Error(data.message)
      await queryClient.invalidateQueries({ queryKey: ['WORKSPACES'] })
      await queryClient.invalidateQueries({ queryKey: ['PROJECTS'] })
      navigate({
        to: '/app/$workspaceId',
        replace: true,
        params: {
          workspaceId: variables.workspace_id,
        },
      })
      toast.success('Project Deleted Successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
