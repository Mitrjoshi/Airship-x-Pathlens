import apiClient from '@/lib/apiClient'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'

interface CreateProjectPayload {
  name: string
  description: string | null
  domain: string | null
  workspace_id: string
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
        to: '/app/$workspace/projects/$project/setup',
        replace: true,
        params: {
          project: data.data.id,
          workspace: variables.workspace_id,
        },
      })
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
        to: '/app/$workspace/projects',
        replace: true,
        params: {
          workspace: variables.workspace_id,
        },
      })
      toast.success('Project Deleted Successfully')
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })
}
