import { z } from 'zod'

export const integrationStatusSchema = z.enum([
  'available',
  'coming_soon',
  'disabled',
])

export type IntegrationStatus = z.infer<typeof integrationStatusSchema>

export const integrationSchema = z.object({
  id: z.uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  content: z.string(),
  assets: z.array(z.string()),
  support: z.url().nullable(),
  documentation: z.url().nullable(),
  terms: z.url().nullable(),
  privacy: z.url().nullable(),
  website: z.url().nullable(),
  category: z.string().min(1),
  iconUrl: z.url().nullable(),
  status: integrationStatusSchema,
  installsCount: z.number().int().nonnegative(),
  isConnected: z.boolean().optional(),
})

export type Integration = z.infer<typeof integrationSchema>

export const getIntegrationsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(integrationSchema),
})

export type GetIntegrationsResponse = z.infer<
  typeof getIntegrationsResponseSchema
>

export const getIntegrationCategoriesResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(z.string().min(1)),
})

export type GetIntegrationCategoriesResponse = z.infer<
  typeof getIntegrationCategoriesResponseSchema
>

export const getIntegrationResponseSchema = z.object({
  success: z.boolean(),
  data: integrationSchema.extend({
    isConnected: z.boolean(),
  }),
})

export type GetIntegrationResponse = z.infer<
  typeof getIntegrationResponseSchema
>

export const slackProjectSettingsSchema = z.object({
  channelId: z.string().min(1),
  dailyEnabled: z.boolean(),
  weeklyEnabled: z.boolean(),
  dailyHour: z.number().int().min(0).max(23),
  weeklyDay: z.number().int().min(1).max(7),
  weeklyHour: z.number().int().min(0).max(23),
  timezone: z.string().min(1),
})

export const slackProjectSettingsResponseSchema =
  slackProjectSettingsSchema.extend({
    channelId: z.string().min(1).nullable(),
  })

export type SlackProjectSettings = z.infer<typeof slackProjectSettingsSchema>

export const slackChannelSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  isMember: z.boolean(),
  memberCount: z.number().int().nonnegative().nullable(),
  topic: z.string().nullable(),
  purpose: z.string().nullable(),
})

export type SlackChannel = z.infer<typeof slackChannelSchema>

export const getSlackChannelsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(slackChannelSchema),
})

export type GetSlackChannelsResponse = z.infer<
  typeof getSlackChannelsResponseSchema
>

export const getSlackSettingsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    workspaceName: z.string().min(1),
    status: z.enum(['connected', 'disconnected', 'error']),
    settings: slackProjectSettingsResponseSchema,
  }),
})

export type GetSlackSettingsResponse = z.infer<
  typeof getSlackSettingsResponseSchema
>

export const pageSpeedStrategySchema = z.enum(['mobile', 'desktop'])
export type PageSpeedStrategy = z.infer<typeof pageSpeedStrategySchema>

export const pageSpeedResultSchema = z.object({
  url: z.url(),
  strategy: pageSpeedStrategySchema,
  fetchedAt: z.string(),
  scores: z.object({
    performance: z.number().int().min(0).max(100).nullable(),
    accessibility: z.number().int().min(0).max(100).nullable(),
    bestPractices: z.number().int().min(0).max(100).nullable(),
    seo: z.number().int().min(0).max(100).nullable(),
  }),
  metrics: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      displayValue: z.string().nullable(),
      numericValue: z.number().nullable(),
    })
  ),
})

export type PageSpeedResult = z.infer<typeof pageSpeedResultSchema>

export const pageSpeedResponseSchema = z.object({
  success: z.boolean(),
  data: pageSpeedResultSchema,
})

export type PageSpeedResponse = z.infer<typeof pageSpeedResponseSchema>

export const searchConsoleRowSchema = z.object({
  key: z.string(),
  clicks: z.number().nonnegative(),
  impressions: z.number().nonnegative(),
  ctr: z.number().nonnegative(),
  position: z.number().nonnegative(),
})

export const searchConsoleResultSchema = z.object({
  siteUrl: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  summary: z.object({
    clicks: z.number().nonnegative(),
    impressions: z.number().nonnegative(),
    ctr: z.number().nonnegative(),
    position: z.number().nonnegative(),
  }),
  topQueries: z.array(searchConsoleRowSchema),
  topPages: z.array(searchConsoleRowSchema),
})

export type SearchConsoleResult = z.infer<typeof searchConsoleResultSchema>

export const searchConsoleResponseSchema = z.object({
  success: z.boolean(),
  data: searchConsoleResultSchema,
})

export type SearchConsoleResponse = z.infer<typeof searchConsoleResponseSchema>
