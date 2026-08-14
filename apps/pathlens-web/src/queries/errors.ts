import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'
import type {
  ErrorGroup,
  ErrorOccurrence,
  ErrorsData,
  ErrorsDevice,
  ErrorsParams,
  ErrorsRange,
  ErrorsResponse,
} from '@workspace/contracts/errors'

export type {
  ErrorGroup,
  ErrorOccurrence,
  ErrorsData,
  ErrorsDevice,
  ErrorsParams,
  ErrorsRange,
  ErrorsResponse,
}

const getErrors = async (params: ErrorsParams): Promise<ErrorsResponse> => {
  const response = await apiClient.get('/errors', { params })

  return response.data
}

export const getErrorsOptions = (params: ErrorsParams) =>
  queryOptions({
    queryKey: ['ERRORS', params],
    queryFn: () => getErrors(params),
    enabled: Boolean(params.workspace_id && params.project_id),
  })
