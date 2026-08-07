import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'

export type DashboardRange = '24h' | '7d' | '30d' | '90d'
export type DashboardDevice = 'all' | 'desktop' | 'mobile' | 'tablet'

type T_WeeklyChange = {
  value: number
  positive: boolean
}

type T_Page = {
  page: string | null
  views: number
  duration: string
}

type T_VisitorsChart = {
  day: string
  visitors: number
}

type T_Difference = {
  value: number
  positive: boolean
}

export type T_Dashboard = {
  visitors: number
  sessions: number
  pageViews: number
  events: number
  avgSessionDuration: string

  weeklyChange: {
    visitors: T_WeeklyChange
    sessions: T_WeeklyChange
    pageViews: T_WeeklyChange
    events: T_WeeklyChange
  }

  pages: T_Page[]
  visitorsChart: T_VisitorsChart[]
  trafficSources: {
    name: string
    value: number
    visitors: number
  }[]
  devices: {
    name: string
    value: number
    sessions: number
  }[]
  visitorBreakdown: {
    new: number
    returning: number
  }
  topEvents: {
    name: string
    count: number
  }[]
  insights: string[]
  liveVisitors: number
  avgSessionDurationChange: T_Difference
  conversionRate: number
  conversionRateChange: T_Difference
}

export interface UsersResponse {
  success: boolean
  data: T_Dashboard
}

const getDashboard = async (params: {
  workspace_id: string
  project_id?: string
  range: DashboardRange
  device: DashboardDevice
}): Promise<UsersResponse> => {
  const res = await apiClient.get('/dashboard', {
    params,
  })

  return res.data
}

export const getDashboardOptions = (params: {
  workspace_id: string
  project_id?: string
  range: DashboardRange
  device: DashboardDevice
}) =>
  queryOptions({
    queryKey: ['DASHBOARD', params],
    queryFn: () => getDashboard(params),
    enabled: !!params.workspace_id,
    // refetchInterval: 5000,
  })
