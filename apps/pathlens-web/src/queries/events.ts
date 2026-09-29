import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'
import type {
  EventsCategory,
  EventsChartResponse,
  EventsDevice,
  EventsParams,
  EventsRange,
  EventsResponse,
  ProjectEvent,
} from '@workspace/contracts/pathlens-events'

export type {
  EventsCategory,
  EventsChartResponse,
  EventsDevice,
  EventsParams,
  EventsRange,
  EventsResponse,
  ProjectEvent,
}

export type EventsChartParams = Pick<
  EventsParams,
  'workspace_id' | 'project_id' | 'range'
>

const getEvents = async (params: EventsParams): Promise<EventsResponse> => {
  const response = await apiClient.get('/events', { params })

  return response.data
}

export const getEventsOptions = (params: EventsParams) =>
  queryOptions({
    queryKey: ['EVENTS', params],
    queryFn: () => getEvents(params),
    enabled: Boolean(params.workspace_id && params.project_id),
    refetchOnWindowFocus: false,
  })

const getEventsChart = async (
  params: EventsChartParams
): Promise<EventsChartResponse> => {
  const response = await apiClient.get('/events/chart', { params })

  return response.data
}

export const getEventsChartOptions = (params: EventsChartParams) =>
  queryOptions({
    queryKey: ['EVENTS_CHART', params],
    queryFn: () => getEventsChart(params),
    enabled: Boolean(params.workspace_id && params.project_id),
    refetchOnWindowFocus: false,
  })
