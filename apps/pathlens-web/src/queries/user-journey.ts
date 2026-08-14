import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'
import type {
  UserJourneyData,
  UserJourneyDevice,
  UserJourneyParams,
  UserJourneyRange,
  UserJourneyResponse,
} from '@workspace/contracts/user-journey'

export type { UserJourneyDevice, UserJourneyRange }
export type {
  UserJourneyNode,
  UserJourneyEdge,
} from '@workspace/contracts/user-journey'

const getUserJourney = async (
  params: UserJourneyParams
): Promise<UserJourneyResponse> => {
  const response = await apiClient.get('/user-journey', { params })

  return response.data
}

export const getUserJourneyOptions = (params: UserJourneyParams) =>
  queryOptions({
    queryKey: ['USER_JOURNEY', params],
    queryFn: () => getUserJourney(params),
    enabled: Boolean(params.workspace_id && params.project_id),
  })

export type { UserJourneyData, UserJourneyParams, UserJourneyResponse }
