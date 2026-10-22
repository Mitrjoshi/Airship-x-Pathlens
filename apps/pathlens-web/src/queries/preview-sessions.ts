import type {
  CreatePreviewSessionRequest,
  CreatePreviewSessionResponse,
} from '@workspace/contracts'
import apiClient from '@/lib/apiClient'

export async function createPreviewSession(
  request: CreatePreviewSessionRequest,
  signal?: AbortSignal
): Promise<CreatePreviewSessionResponse> {
  const response = await apiClient.post<CreatePreviewSessionResponse>(
    '/heatmaps/preview-sessions',
    request,
    { signal }
  )
  return response.data
}

export async function revokePreviewSession(sessionId: string): Promise<void> {
  await apiClient.delete('/heatmaps/preview-sessions', {
    data: { session_id: sessionId },
  })
}
