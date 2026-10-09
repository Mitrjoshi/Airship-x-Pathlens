import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'
import type {
  HeatmapClickPoint,
  HeatmapDevice,
  HeatmapHotArea,
  HeatmapPage,
  HeatmapPageDetail,
  HeatmapDetailsParams,
  HeatmapDetailsResponse,
  HeatmapScrollPoint,
  HeatmapsData,
  HeatmapsListData,
  HeatmapsListResponse,
  HeatmapsParams,
  HeatmapsRange,
  HeatmapsResponse,
} from '@workspace/contracts/heatmaps'

export type {
  HeatmapClickPoint,
  HeatmapDevice,
  HeatmapHotArea,
  HeatmapPage,
  HeatmapPageDetail,
  HeatmapDetailsParams,
  HeatmapDetailsResponse,
  HeatmapScrollPoint,
  HeatmapsData,
  HeatmapsListData,
  HeatmapsListResponse,
  HeatmapsParams,
  HeatmapsRange,
  HeatmapsResponse,
}

const getHeatmapsList = async (
  params: HeatmapsParams
): Promise<HeatmapsListResponse> => {
  const response = await apiClient.get('/heatmaps', {
    params: {
      ...params,
      page: params.page ?? 1,
      page_size: params.page_size ?? 50,
    },
  })

  return response.data
}

const getHeatmapDetails = async (
  params: HeatmapDetailsParams
): Promise<HeatmapDetailsResponse> => {
  const response = await apiClient.get('/heatmaps/detail', { params })

  return response.data
}

export const getHeatmapsOptions = (params: HeatmapsParams) =>
  queryOptions({
    queryKey: ['HEATMAPS', params],
    queryFn: async (): Promise<HeatmapsResponse> => {
      const listResponse = await getHeatmapsList(params)

      return {
        success: listResponse.success,
        data: {
          ...listResponse.data,
          selectedPage: null,
        },
      }
    },
    enabled: Boolean(params.workspace_id && params.project_id),
    // refetchInterval: 10_000,
  })

export const getHeatmapDetailsOptions = (params: HeatmapDetailsParams) =>
  queryOptions({
    queryKey: ['HEATMAP_DETAILS', params],
    queryFn: () => getHeatmapDetails(params),
    enabled: Boolean(
      params.workspace_id && params.project_id && params.page_path
    ),
  })
