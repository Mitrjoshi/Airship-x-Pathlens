import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'
import type {
  HeatmapClickPoint,
  HeatmapDevice,
  HeatmapHotArea,
  HeatmapPage,
  HeatmapPageDetail,
  HeatmapScrollPoint,
  HeatmapsData,
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
  HeatmapScrollPoint,
  HeatmapsData,
  HeatmapsParams,
  HeatmapsRange,
  HeatmapsResponse,
}

const getHeatmaps = async (
  params: HeatmapsParams
): Promise<HeatmapsResponse> => {
  const response = await apiClient.get('/heatmaps', { params })

  return response.data
}

export const getHeatmapsOptions = (params: HeatmapsParams) =>
  queryOptions({
    queryKey: ['HEATMAPS', params],
    queryFn: () => getHeatmaps(params),
    enabled: Boolean(params.workspace_id && params.project_id),
    // refetchInterval: 10_000,
  })
