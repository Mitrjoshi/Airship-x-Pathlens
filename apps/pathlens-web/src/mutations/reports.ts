import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import apiClient from '@/lib/apiClient'
import type {
  ReportFilters,
  ReportGeneration,
  ReportType,
} from '@/queries/reports'

export interface GenerateReportPayload extends ReportFilters {
  report_type: ReportType
}

export interface GenerateReportResponse {
  success: boolean
  message?: string
  data: ReportGeneration
}

const generateReport = async (payload: GenerateReportPayload) => {
  const response = await apiClient.post<GenerateReportResponse>(
    '/analytics/reports',
    payload
  )

  return response.data
}

export function useGenerateReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: generateReport,
    onSuccess: async (data) => {
      if (!data.success) {
        throw new Error(data.message ?? 'Unable to generate report.')
      }

      if (data.data.downloadUrl) {
        const anchor = document.createElement('a')
        anchor.href = data.data.downloadUrl
        anchor.download = data.data.fileName ?? 'pathlens-report.xlsx'
        anchor.style.display = 'none'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      }

      await queryClient.invalidateQueries({
        queryKey: ['REPORT_GENERATIONS'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['REPORT_DOWNLOAD', data.data.id],
      })
      toast.success('Report generated.')
    },
    onError: (error) => toast.error(error.message),
  })
}
