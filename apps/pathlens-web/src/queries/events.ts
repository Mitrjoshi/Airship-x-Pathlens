import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'
import type {
  EventsParams,
  EventsRange,
  EventsResponse,
  ProjectEvent,
} from '@workspace/contracts/pathlens-events'

export type { EventsParams, EventsRange, EventsResponse, ProjectEvent }

const getEvents = async (params: EventsParams): Promise<EventsResponse> => {
  const response = await apiClient.get('/events', { params })

  return response.data
}

export const getEventsOptions = (params: EventsParams) =>
  queryOptions({
    queryKey: ['EVENTS', params],
    queryFn: () => getEvents(params),
    enabled: Boolean(params.workspace_id && params.project_id),
    refetchInterval: 10_000,
  })
