import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'

export type GoalRange = '24h' | '7d' | '30d' | '90d'
export type GoalType =
  'event' | 'revenue' | 'pageview' | 'button' | 'form_submit'
export type GoalDashboardDevice = 'all' | 'desktop' | 'mobile' | 'tablet'

export interface Goal {
  id: string
  name: string
  type: 'Event' | 'Revenue' | 'Pageview' | 'Button' | 'Form submit'
  target: number
  current: number
  unit: string
  matchTarget: string
  matchPath: string | null
  domainId: string | null
  domain: string | null
  trend: 'up' | 'down' | 'flat'
  trendValue: string
  status: 'On Track' | 'At Risk' | 'Achieved'
  deadline: string | null
  createdAt: string
  updatedAt: string
}

export interface GoalsParams {
  workspace_id: string
  project_id: string
  domain?: string
  domain_id?: string
  range: GoalRange
}

export interface GoalPayload {
  workspace_id: string
  project_id: string
  domain_id: string
  name: string
  type: GoalType
  target: number
  unit: string
  match_target: string
  match_path: string | null
  deadline: string | null
}

export interface GoalsResponse {
  success: boolean
  data: Goal[]
}

export interface GoalDashboardParams {
  goal_id: string
  workspace_id: string
  project_id: string
  range: GoalRange
  device: GoalDashboardDevice
  domain?: string
}

export interface GoalDashboardBreakdown {
  name: string
  completions: number
  uniqueVisitors: number
  uniqueSessions: number
}

export interface GoalDashboardResponse {
  success: boolean
  data: {
    goal: {
      id: string
      name: string
      type: Goal['type']
      target: number
      unit: string
      matchTarget: string
      matchPath: string | null
      deadline: string | null
      createdAt: string
      updatedAt: string
    }
    range: {
      value: GoalRange
      currentFrom: string
      currentTo: string
      previousFrom: string
      previousTo: string
    }
    summary: {
      completions: number
      previousCompletions: number
      trend: Goal['trend']
      trendValue: string
      status: Goal['status']
      uniqueVisitors: number
      previousUniqueVisitors: number
      uniqueSessions: number
      previousUniqueSessions: number
      visitorConversionRate: number
      sessionConversionRate: number
      revenue: number
      previousRevenue: number
    }
    trend: {
      date: string
      completions: number
      uniqueVisitors: number
      uniqueSessions: number
      revenue: number
    }[]
    breakdowns: {
      devices: GoalDashboardBreakdown[]
      browsers: GoalDashboardBreakdown[]
      operatingSystems: GoalDashboardBreakdown[]
      countries: GoalDashboardBreakdown[]
      sources: GoalDashboardBreakdown[]
      pages: GoalDashboardBreakdown[]
    }
    recentCompletions: {
      occurredAt: string
      type: string
      path: string | null
      device: string | null
      browser: string | null
      operatingSystem: string | null
      country: string | null
      city: string | null
      source: string
      revenue: number
    }[]
  }
}

const getGoals = async (params: GoalsParams): Promise<GoalsResponse> => {
  const response = await apiClient.get('/goals', { params })

  return response.data
}

export const getGoalsOptions = (params: GoalsParams) =>
  queryOptions({
    queryKey: ['GOALS', params],
    queryFn: () => getGoals(params),
    enabled: Boolean(params.workspace_id && params.project_id),
  })

const getGoalDashboard = async (
  params: GoalDashboardParams
): Promise<GoalDashboardResponse> => {
  const { goal_id, ...queryParams } = params
  const response = await apiClient.get(`/goals/${goal_id}/dashboard`, {
    params: queryParams,
  })

  return response.data
}

export const getGoalDashboardOptions = (params: GoalDashboardParams) =>
  queryOptions({
    queryKey: ['GOAL_DASHBOARD', params],
    queryFn: () => getGoalDashboard(params),
    enabled: Boolean(
      params.goal_id && params.workspace_id && params.project_id
    ),
  })
