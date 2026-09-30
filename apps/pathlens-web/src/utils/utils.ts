export function formatNumber(value: number | undefined | null): string {
  const num = typeof value === 'number' ? value : Number(value) || 0

  const truncateTo2 = (value: number) => Math.trunc(value * 100) / 100

  if (num < 1000) {
    return truncateTo2(num).toString()
  }

  const units = ['K', 'M', 'B', 'T']

  let unitIndex = -1
  let formatted = num

  while (formatted >= 1000 && unitIndex < units.length - 1) {
    formatted /= 1000
    unitIndex++
  }

  return `${truncateTo2(formatted)}${units[unitIndex]}`
}

export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }
) {
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(date))
}

export function formatRelativeTime(date: string, now = Date.now()): string {
  const timestamp = new Date(date).getTime()

  if (Number.isNaN(timestamp)) return 'Unknown'

  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000))

  if (seconds < 60) return 'Just now'

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return formatDate(date, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  })
}

export function formatMs(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`
  return `${Math.round(value)}ms`
}

export function maskReference(value: string | null) {
  if (!value) return null
  if (value.length <= 12) return value

  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

export const getPaginationItems = (
  currentPage: number,
  totalPages: number
): Array<number | 'ellipsis'> => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, 'ellipsis', totalPages]
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      'ellipsis',
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ]
  }

  return [
    1,
    'ellipsis',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis',
    totalPages,
  ]
}
