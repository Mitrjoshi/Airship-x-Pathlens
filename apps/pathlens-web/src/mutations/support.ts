import apiClient from '@/lib/apiClient'
import { toast } from '@/lib/toast'
import { useMutation } from '@tanstack/react-query'
import {
  createSupportRequestSchema,
  supportContentType,
  type CreateSupportRequestInput,
  type SupportRequestReceipt,
  type SupportUpload,
} from '@workspace/contracts'

type CreateSupportRequestPayload = Omit<
  CreateSupportRequestInput,
  'attachment_ids'
> & {
  files?: File[]
}

const createSupportRequest = async ({
  files = [],
  ...input
}: CreateSupportRequestPayload): Promise<SupportRequestReceipt> => {
  const payload = createSupportRequestSchema.parse(input)
  const attachmentIds: string[] = []

  if (files.length) {
    const { data } = await apiClient.post<{
      success: true
      data: SupportUpload[]
    }>('/support/attachments', {
      workspace_id: payload.workspace_id,
      project_id: payload.project_id,
      files: files.map((file) => ({
        name: file.name,
        content_type: supportContentType(file.name, file.type) ?? file.type,
        size: file.size,
      })),
    })

    if (data.data.length !== files.length) {
      throw new Error('Unable to prepare attachments. Please try again.')
    }
    // Use fetch, not apiClient: dashboard credentials must never be sent to S3.
    for (const [index, upload] of data.data.entries()) {
      const body = new FormData()
      for (const [key, value] of Object.entries(upload.fields)) {
        body.append(key, value)
      }
      body.append('file', files[index]!)
      const response = await fetch(upload.url, {
        method: 'POST',
        body,
        credentials: 'omit',
      })
      if (!response.ok) {
        throw new Error(
          'An attachment could not be uploaded. Please try again.'
        )
      }
      attachmentIds.push(upload.id)
    }
  }

  const { data } = await apiClient.post<{
    success: true
    data: SupportRequestReceipt
  }>('/support/requests', { ...payload, attachment_ids: attachmentIds })
  return data.data
}

export const useCreateSupportRequest = () => {
  return useMutation({
    mutationFn: createSupportRequest,
    // Retrying the entire flow could duplicate a request after a lost response.
    retry: false,
    onSuccess: () => toast.success('Your support request has been submitted.'),
    onError: (error) => toast.error(error.message),
  })
}
