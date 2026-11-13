import type { ReactNode } from 'react'
import { toast as toastManager } from '@workspace/ui/components/toast'

type ToastType = 'success' | 'info' | 'warning' | 'error' | 'loading'

function addToast(title: ReactNode, type?: ToastType) {
  return toastManager.add({
    title,
    ...(type ? { type } : {}),
  })
}

export const toast = {
  add: toastManager.add.bind(toastManager),
  default: (title: ReactNode) => addToast(title),
  success: (title: ReactNode) => addToast(title, 'success'),
  info: (title: ReactNode) => addToast(title, 'info'),
  warning: (title: ReactNode) => addToast(title, 'warning'),
  error: (title: ReactNode) => addToast(title, 'error'),
  loading: (title: ReactNode) => addToast(title, 'loading'),
}
