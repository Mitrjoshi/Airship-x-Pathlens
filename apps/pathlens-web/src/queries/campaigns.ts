import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'
import type {
  CampaignAnalyticsData,
  CampaignAnalyticsParams,
  CampaignAnalyticsResponse,
  CampaignDevice,
  CampaignGoalOption,
  CampaignRange,
  CampaignRow,
  CampaignSummary,
} from '@workspace/contracts/campaigns'

export type {
  CampaignAnalyticsData,
  CampaignAnalyticsParams,
  CampaignAnalyticsResponse,
  CampaignDevice,
  CampaignGoalOption,
  CampaignRange,
  CampaignRow,
  CampaignSummary,
}

const getCampaigns = async (
  params: CampaignAnalyticsParams
): Promise<CampaignAnalyticsResponse> => {
  const response = await apiClient.get('/campaigns', { params })

  return response.data
}

export const getCampaignsOptions = (params: CampaignAnalyticsParams) =>
  queryOptions({
    queryKey: ['CAMPAIGNS', params],
    queryFn: () => getCampaigns(params),
    enabled: Boolean(params.workspace_id && params.project_id),
  })
