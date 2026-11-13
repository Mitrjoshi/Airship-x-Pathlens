import { z } from 'zod'

export const analyticsSummaryReportTypeSchema = z.enum(['daily', 'weekly'])
export type AnalyticsSummaryReportType = z.infer<
  typeof analyticsSummaryReportTypeSchema
>

export const analyticsSummaryDirectionSchema = z.enum(['up', 'down', 'flat'])

export const analyticsSummaryComparisonSchema = z.object({
  current: z.number().finite().nonnegative(),
  previous: z.number().finite().nonnegative(),
  absoluteChange: z.number().finite(),
  percentChange: z.number().finite().nullable(),
  direction: analyticsSummaryDirectionSchema,
})

export const analyticsSummaryMetricSchema = z.object({
  value: z.number().finite().nonnegative(),
  comparison: analyticsSummaryComparisonSchema,
})

export const analyticsSummaryPeriodSchema = z
  .object({
    timezone: z.string().min(1),
    start: z.string().datetime(),
    end: z.string().datetime(),
    previousStart: z.string().datetime(),
    previousEnd: z.string().datetime(),
  })
  .superRefine((period, context) => {
    const start = new Date(period.start).getTime()
    const end = new Date(period.end).getTime()
    const previousStart = new Date(period.previousStart).getTime()
    const previousEnd = new Date(period.previousEnd).getTime()

    if (end <= start) {
      context.addIssue({
        code: 'custom',
        path: ['end'],
        message: 'Reporting period end must be after its start.',
      })
    }
    if (previousEnd <= previousStart) {
      context.addIssue({
        code: 'custom',
        path: ['previousEnd'],
        message: 'Previous reporting period end must be after its start.',
      })
    }
  })

export const analyticsSummaryEventCountSchema = z.object({
  type: z.string().min(1),
  count: z.number().int().nonnegative(),
  comparison: analyticsSummaryComparisonSchema,
})

export const analyticsSummaryTopPageSchema = z.object({
  path: z.string().nullable(),
  views: z.number().int().nonnegative(),
  comparison: analyticsSummaryComparisonSchema,
})

export const analyticsSummaryTopEventSchema = z.object({
  type: z.string().min(1),
  count: z.number().int().nonnegative(),
  comparison: analyticsSummaryComparisonSchema,
})

export const analyticsSummaryFunnelStepSchema = z.object({
  name: z.string().min(1),
  visitors: z.number().int().nonnegative(),
})

export const analyticsSummaryFunnelComparisonSchema =
  analyticsSummaryComparisonSchema.extend({
    percentagePointChange: z.number().finite(),
  })

export const analyticsSummaryFunnelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  steps: z.array(analyticsSummaryFunnelStepSchema),
  conversionRate: z.number().finite().nonnegative(),
  previousConversionRate: z.number().finite().nonnegative(),
  conversionComparison: analyticsSummaryFunnelComparisonSchema,
})

export const analyticsSummaryReportSchema = z.object({
  projectId: z.string().min(1),
  reportType: analyticsSummaryReportTypeSchema,
  period: analyticsSummaryPeriodSchema,
  metrics: z.object({
    uniqueVisitors: analyticsSummaryMetricSchema,
    totalSessions: analyticsSummaryMetricSchema,
    pageViews: analyticsSummaryMetricSchema,
    totalEvents: analyticsSummaryMetricSchema,
  }),
  eventCounts: z.array(analyticsSummaryEventCountSchema),
  topPages: z.array(analyticsSummaryTopPageSchema),
  topEvents: z.array(analyticsSummaryTopEventSchema),
  funnels: z.array(analyticsSummaryFunnelSchema),
})

export type AnalyticsSummaryComparison = z.infer<
  typeof analyticsSummaryComparisonSchema
>
export type AnalyticsSummaryReport = z.infer<
  typeof analyticsSummaryReportSchema
>
