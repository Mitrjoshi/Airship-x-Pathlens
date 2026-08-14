import { z } from 'zod'

export const DASHBOARD_WIDGET_TYPES = [
  'metric',
  'line',
  'bar',
  'funnel',
  'table',
  'heatmap',
  'conversion',
  'retention',
] as const

export const dashboardWidgetTypeSchema = z.enum(DASHBOARD_WIDGET_TYPES)

export const dashboardRangeSchema = z.enum(['24h', '7d', '30d', '90d'])
export const dashboardDeviceSchema = z.enum([
  'all',
  'desktop',
  'mobile',
  'tablet',
])

export const dashboardMetricSchema = z.enum([
  'visitors',
  'sessions',
  'pageViews',
  'events',
  'avgSessionDuration',
  'conversionRate',
  'liveVisitors',
])

export const dashboardWidgetConfigSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('metric'),
    metric: dashboardMetricSchema,
  }),
  z.object({
    type: z.literal('line'),
    metric: z.enum(['visitors', 'sessions']),
  }),
  z.object({
    type: z.literal('bar'),
    dimension: z.enum(['devices', 'referrers', 'countries', 'browsers']),
  }),
  z.object({
    type: z.literal('funnel'),
    funnelId: z.string().trim().min(1),
  }),
  z.object({
    type: z.literal('table'),
    source: z.enum(['pages', 'referrers', 'countries', 'browsers']),
    limit: z.number().int().min(3).max(10).default(5),
  }),
  z.object({
    type: z.literal('heatmap'),
    pagePath: z.string().trim().max(2048).optional(),
    mode: z.enum(['clicks', 'scroll']).default('clicks'),
  }),
  z.object({
    type: z.literal('conversion'),
    mode: z.enum(['global', 'funnel', 'goal']),
    funnelId: z.string().trim().min(1).optional(),
    goalId: z.string().trim().min(1).optional(),
  }),
  z.object({
    type: z.literal('retention'),
    interval: z.enum(['day', 'week']),
    periods: z.number().int().min(4).max(12),
  }),
])

export const dashboardWidgetLayoutSchema = z.object({
  x: z.number().int().min(0).max(11),
  y: z.number().int().min(0),
  w: z.number().int().min(2).max(12),
  h: z.number().int().min(2).max(12),
})

export const dashboardCreatePayloadSchema = z.object({
  workspace_id: z.string().trim().min(1),
  project_id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).nullable().optional(),
})

export const dashboardUpdatePayloadSchema = z.object({
  workspace_id: z.string().trim().min(1),
  project_id: z.string().trim().min(1),
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(300).nullable().optional(),
})

export const dashboardWidgetCreatePayloadSchema = z.object({
  workspace_id: z.string().trim().min(1),
  project_id: z.string().trim().min(1),
  title: z.string().trim().max(100).nullable().optional(),
  config: dashboardWidgetConfigSchema,
  layout: dashboardWidgetLayoutSchema.optional(),
})

export const dashboardWidgetUpdatePayloadSchema = z.object({
  workspace_id: z.string().trim().min(1),
  project_id: z.string().trim().min(1),
  title: z.string().trim().max(100).nullable().optional(),
  config: dashboardWidgetConfigSchema.optional(),
  layout: dashboardWidgetLayoutSchema.optional(),
})

export type DashboardWidgetType = z.infer<typeof dashboardWidgetTypeSchema>
export type DashboardRange = z.infer<typeof dashboardRangeSchema>
export type DashboardDevice = z.infer<typeof dashboardDeviceSchema>
export type DashboardMetric = z.infer<typeof dashboardMetricSchema>
export type DashboardWidgetConfig = z.infer<typeof dashboardWidgetConfigSchema>
export type DashboardWidgetLayout = z.infer<typeof dashboardWidgetLayoutSchema>
export type DashboardCreatePayload = z.infer<
  typeof dashboardCreatePayloadSchema
>
export type DashboardUpdatePayload = z.infer<
  typeof dashboardUpdatePayloadSchema
>
export type DashboardWidgetCreatePayload = z.infer<
  typeof dashboardWidgetCreatePayloadSchema
>
export type DashboardWidgetUpdatePayload = z.infer<
  typeof dashboardWidgetUpdatePayloadSchema
>

export interface DashboardWidget {
  id: string
  dashboardId: string
  type: DashboardWidgetType
  title: string | null
  config: DashboardWidgetConfig
  layout: DashboardWidgetLayout
  orderIndex: number
  createdAt: string
  updatedAt: string
}

export interface DashboardSummary {
  id: string
  workspaceId: string
  projectId: string
  name: string
  description: string | null
  createdBy: string
  widgetCount: number
  createdAt: string
  updatedAt: string
}

export interface Dashboard extends Omit<DashboardSummary, 'widgetCount'> {
  widgets: DashboardWidget[]
}

export interface DashboardsResponse {
  success: boolean
  data: DashboardSummary[]
}

export interface DashboardResponse {
  success: boolean
  data: Dashboard
}
