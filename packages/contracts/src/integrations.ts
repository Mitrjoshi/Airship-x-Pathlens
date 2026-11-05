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
  category: z.string().min(1),
  iconUrl: z.url().nullable(),
  status: integrationStatusSchema,
})

export type Integration = z.infer<typeof integrationSchema>

export const getIntegrationsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(integrationSchema),
})

export type GetIntegrationsResponse = z.infer<
  typeof getIntegrationsResponseSchema
>

export const projectIntegrationConnectionSchema = z.object({
  id: z.uuid(),
  providerWorkspaceId: z.string().min(1),
  providerWorkspaceName: z.string().min(1),
  status: z.enum(['connected', 'disconnected', 'error']),
  connectedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
  lastError: z.string().nullable(),
})

export const projectIntegrationSchema = integrationSchema.extend({
  connection: projectIntegrationConnectionSchema.nullable(),
})

export type ProjectIntegration = z.infer<typeof projectIntegrationSchema>

export const getProjectIntegrationsResponseSchema = z.object({
  success: z.boolean(),
  data: z.array(projectIntegrationSchema),
})

export type GetProjectIntegrationsResponse = z.infer<
  typeof getProjectIntegrationsResponseSchema
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
