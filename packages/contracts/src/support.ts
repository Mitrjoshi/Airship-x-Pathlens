import { z } from 'zod'

export const SUPPORT_MAX_FILES = 5
export const SUPPORT_MAX_FILE_SIZE = 10 * 1024 * 1024
export const SUPPORT_MAX_TOTAL_SIZE = 25 * 1024 * 1024

export const supportFileTypes: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    '.docx',
  ],
  'text/plain': ['.txt', '.log'],
  'text/csv': ['.csv'],
  'application/json': ['.json'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
}

export function supportContentType(name: string, type: string): string | null {
  const extension = `.${name.split('.').pop()?.toLowerCase() ?? ''}`
  for (const [mime, extensions] of Object.entries(supportFileTypes)) {
    if (
      extensions.includes(extension) &&
      (type === mime ||
        (!type && ['.txt', '.log', '.csv', '.json'].includes(extension)) ||
        (mime === 'text/plain' &&
          type === 'application/octet-stream' &&
          extension === '.log'))
    )
      return mime
  }
  return null
}

export const supportIssues = [
  'dashboard',
  'analytics',
  'visitors',
  'events',
  'user_journeys',
  'session_replay',
  'heatmaps',
  'funnels',
  'goals',
  'performance',
  'traffic_sources',
  'reports',
  'ai_insights',
  'seo',
  'projects',
  'workspace_team_management',
  'integrations',
  'api_tracking_setup',
  'privacy_data_protection',
  'billing_subscription',
  'notifications',
  'feedback',
  'other',
] as const

export const supportServices = [
  'Dashboard',
  'Analytics',
  'Projects',
  'Workspace & Team Management',
  'Integrations',
  'Tracking Setup',
  'Privacy & Data Protection',
  'Billing & Subscription',
  'Other',
] as const

export const supportScopeSchema = z.object({
  workspace_id: z.uuid(),
  project_id: z.uuid().nullable().optional().default(null),
})

export const supportFieldsSchema = supportScopeSchema.extend({
  issue_id: z.enum(supportIssues),
  severity: z.enum(['low', 'normal', 'high', 'urgent']),
  subject: z.string().trim().min(1, 'Subject is required.').max(200),
  service: z
    .array(z.enum(supportServices))
    .max(supportServices.length)
    .default([]),
  message: z.string().trim().min(1, 'Message is required.').max(5000),
})

export const supportAttachmentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine(
        (name) => !/[\\/\u0000-\u001f\u007f]/.test(name),
        'Invalid attachment filename.'
      ),
    content_type: z.string().max(150),
    size: z.number().int().min(1).max(SUPPORT_MAX_FILE_SIZE),
  })
  .refine(
    (file) => supportContentType(file.name, file.content_type) !== null,
    'Unsupported attachment format.'
  )

export const supportUploadSchema = supportScopeSchema
  .extend({
    files: z.array(supportAttachmentSchema).min(1).max(SUPPORT_MAX_FILES),
  })
  .refine(
    ({ files }) =>
      files.reduce((sum, file) => sum + file.size, 0) <= SUPPORT_MAX_TOTAL_SIZE,
    'Total attachment size cannot exceed 25 MB.'
  )

export const createSupportRequestSchema = supportFieldsSchema
  .extend({
    attachment_ids: z.array(z.uuid()).max(SUPPORT_MAX_FILES).default([]),
  })
  .refine(
    ({ attachment_ids }) =>
      new Set(attachment_ids).size === attachment_ids.length,
    'Duplicate attachment IDs.'
  )

export type SupportUploadInput = z.infer<typeof supportUploadSchema>
export type CreateSupportRequestInput = z.infer<
  typeof createSupportRequestSchema
>
export type SupportUpload = {
  id: string
  url: string
  fields: Record<string, string>
}
export type SupportRequestReceipt = {
  id: string
  createdAt: string
}
