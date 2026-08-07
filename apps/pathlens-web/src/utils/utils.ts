export function formatNumber(value: number | undefined | null): string {
  const num = typeof value === 'number' ? value : Number(value) || 0

  if (num < 1000) return num.toString()

  const units = ['K', 'M', 'B', 'T']
  let unitIndex = -1
  let formatted = num

  while (formatted >= 1000 && unitIndex < units.length - 1) {
    formatted /= 1000
    unitIndex++
  }

  return `${Number(formatted.toFixed(formatted < 10 ? 1 : 0))}${units[unitIndex]}`
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
