import apiClient from '@/lib/apiClient'
import { queryOptions } from '@tanstack/react-query'

export type GoalRange = '24h' | '7d' | '30d' | '90d'
export type GoalType =
  'event' | 'revenue' | 'pageview' | 'button' | 'form_submit'

export interface Goal {
  id: string
  name: string
  type: 'Event' | 'Revenue' | 'Pageview' | 'Button' | 'Form submit'
  target: number
  current: number
  unit: string
  matchTarget: string
  matchPath: string | null
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
  range: GoalRange
}

export interface GoalPayload {
  workspace_id: string
  project_id: string
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
