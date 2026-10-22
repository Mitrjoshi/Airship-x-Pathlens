import { z } from 'zod'

export const previewDeviceSchema = z.enum(['desktop', 'mobile', 'tablet'])
export const previewIntentSchema = z.enum(['compatibility', 'heatmap'])

export const createPreviewSessionRequestSchema = z.object({
  workspace_id: z.uuid(),
  project_id: z.uuid(),
  domain_id: z.uuid(),
  page_path: z.string().trim().min(1).max(2048),
  device: previewDeviceSchema,
  preview_intent: previewIntentSchema.default('compatibility'),
})

export const previewSessionClaimsSchema = z.object({
  sessionId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  projectDomainId: z.string().uuid(),
  userId: z.string().uuid(),
  canonicalHostname: z.string().min(1),
  allowedHostnames: z.array(z.string().min(1)).min(1),
  pathname: z.string().min(1),
  device: previewDeviceSchema,
  previewIntent: previewIntentSchema,
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable(),
})

export const validatePreviewSessionRequestSchema = z.object({
  handle: z.string().min(32).max(128),
})

export const revokePreviewSessionRequestSchema = z.object({
  session_id: z.string().uuid(),
})

export const resourceAuthorizationRequestSchema = z.object({
  scheme: z.string().min(1),
  hostname: z.string().min(1),
  port: z.number().int().min(1).max(65535).nullable(),
  method: z.enum(['GET', 'HEAD']),
})

export const resourceAuthorizationResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().nullable(),
  canonicalHostname: z.string(),
})

export interface CreatePreviewSessionRequest {
  workspace_id: string
  project_id: string
  domain_id: string
  page_path: string
  device: z.infer<typeof previewDeviceSchema>
  preview_intent: PreviewIntent
}

export type PreviewDevice = z.infer<typeof previewDeviceSchema>
export type PreviewIntent = z.infer<typeof previewIntentSchema>

export type PreviewSessionClaims = z.infer<typeof previewSessionClaimsSchema>

export interface CreatePreviewSessionResponse {
  success: true
  data: {
    session_id: string
    iframe_url: string
    expires_at: string
    project_id: string
    domain_id: string
    canonical_hostname: string
    pathname: string
    device: PreviewDevice
    preview_intent: PreviewIntent
    protocol_version: 1
  }
}

export interface ValidatePreviewSessionResponse {
  success: true
  data: PreviewSessionClaims
}

export interface RevokePreviewSessionResponse {
  success: true
  data: {
    session_id: string
    revoked: boolean
  }
}

export interface PreviewErrorResponse {
  success: false
  error: {
    code:
      | 'SESSION_MISSING'
      | 'SESSION_EXPIRED'
      | 'SESSION_REVOKED'
      | 'DOMAIN_NOT_ALLOWED'
      | 'PROJECT_NOT_ALLOWED'
      | 'PATH_NOT_ALLOWED'
      | 'METHOD_NOT_ALLOWED'
      | 'UNSUPPORTED_SCHEME'
      | 'UNEXPECTED_PORT'
      | 'PROXY_NOT_IMPLEMENTED'
    message: string
    request_id?: string
    retryable: boolean
  }
}

export type ResourceAuthorizationResult = z.infer<
  typeof resourceAuthorizationResultSchema
>
