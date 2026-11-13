import { z } from 'zod'

export const dashboardIntegrationSchema = z.object({
  provider: z.string().min(1),
  name: z.string().min(1),
  iconUrl: z.url().nullable(),
  status: z.literal('connected'),
  supportsDateRange: z.boolean(),
  requiresDomain: z.boolean(),
  dashboardApiAvailable: z.boolean(),
})

export type DashboardIntegration = z.infer<typeof dashboardIntegrationSchema>

export const getDashboardIntegrationsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(dashboardIntegrationSchema),
})

export type GetDashboardIntegrationsResponse = z.infer<
  typeof getDashboardIntegrationsResponseSchema
>

export const googleSearchConsoleDashboardRowSchema = z.object({
  key: z.string(),
  clicks: z.number().nonnegative(),
  impressions: z.number().nonnegative(),
  // CTR is the provider ratio, where 0.128 means 12.8%.
  ctr: z.number().nonnegative(),
  position: z.number().nonnegative(),
})

export const googleSearchConsoleDashboardDataSchema = z.object({
  siteUrl: z.string().min(1),
  period: z.object({
    startDate: z.string(),
    endDate: z.string(),
    timezone: z.literal('UTC'),
  }),
  summary: z.object({
    clicks: z.number().nonnegative(),
    impressions: z.number().nonnegative(),
    ctr: z.number().nonnegative(),
    position: z.number().nonnegative(),
  }),
  topQueries: z.array(
    z.object({
      query: z.string(),
      clicks: z.number().nonnegative(),
      impressions: z.number().nonnegative(),
      ctr: z.number().nonnegative(),
      position: z.number().nonnegative(),
    })
  ),
  topPages: z.array(
    z.object({
      page: z.string(),
      clicks: z.number().nonnegative(),
      impressions: z.number().nonnegative(),
      ctr: z.number().nonnegative(),
      position: z.number().nonnegative(),
    })
  ),
  fetchedAt: z.iso.datetime(),
})

export type GoogleSearchConsoleDashboardData = z.infer<
  typeof googleSearchConsoleDashboardDataSchema
>

export const googleSearchConsoleDashboardResponseSchema = z.object({
  success: z.boolean(),
  data: googleSearchConsoleDashboardDataSchema,
})

export type GoogleSearchConsoleDashboardResponse = z.infer<
  typeof googleSearchConsoleDashboardResponseSchema
>

const moneySchema = z.record(z.string(), z.number().int())

export const stripeDashboardDataSchema = z.object({
  provider: z.literal('stripe'),
  period: z.object({
    start: z.iso.datetime(),
    end: z.iso.datetime(),
    days: z.number().int().min(1),
  }),
  fetchedAt: z.iso.datetime(),
  account: z.object({ id: z.string().min(1) }),
  revenue: z.object({
    gross: moneySchema,
    refunds: moneySchema,
    netAfterRefunds: moneySchema,
    unit: z.literal('minor'),
    feesIncluded: z.boolean(),
  }),
  payments: z.object({
    successfulCharges: z.number().int().nonnegative(),
    failedPaymentIntents: z.number().int().nonnegative(),
    totalPaymentIntents: z.number().int().nonnegative(),
  }),
  subscriptions: z.object({
    active: z.number().int().nonnegative(),
    trialing: z.number().int().nonnegative(),
    canceled: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
    snapshot: z.boolean(),
  }),
  revenueByDay: z.array(
    z.object({
      date: z.string(),
      gross: moneySchema,
      refunds: moneySchema,
    })
  ),
})

export type StripeDashboardData = z.infer<typeof stripeDashboardDataSchema>

export const stripeDashboardResponseSchema = z.object({
  success: z.boolean(),
  data: stripeDashboardDataSchema,
})

export type StripeDashboardResponse = z.infer<
  typeof stripeDashboardResponseSchema
>

const pageSpeedMetricSchema = z.object({
  displayValue: z.string().nullable(),
  numericValue: z.number().nullable(),
})

export const pageSpeedDashboardDataSchema = z.object({
  provider: z.literal('pagespeed-insights'),
  url: z.url(),
  strategy: z.enum(['mobile', 'desktop']),
  fetchedAt: z.iso.datetime(),
  scores: z.object({
    performance: z.number().int().min(0).max(100).nullable(),
    accessibility: z.number().int().min(0).max(100).nullable(),
    bestPractices: z.number().int().min(0).max(100).nullable(),
    seo: z.number().int().min(0).max(100).nullable(),
  }),
  metrics: z.object({
    largestContentfulPaint: pageSpeedMetricSchema,
    firstContentfulPaint: pageSpeedMetricSchema,
    totalBlockingTime: pageSpeedMetricSchema,
    cumulativeLayoutShift: pageSpeedMetricSchema,
    speedIndex: pageSpeedMetricSchema,
  }),
})

export type PageSpeedDashboardData = z.infer<
  typeof pageSpeedDashboardDataSchema
>

export const pageSpeedDashboardResponseSchema = z.object({
  success: z.boolean(),
  data: pageSpeedDashboardDataSchema,
})

export type PageSpeedDashboardResponse = z.infer<
  typeof pageSpeedDashboardResponseSchema
>
