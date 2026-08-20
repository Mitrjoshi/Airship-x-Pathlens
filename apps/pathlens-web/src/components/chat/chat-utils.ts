export function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function formatChatTime(iso: string): string {
  const date = new Date(iso)

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function formatChatDay(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfDate.getTime()) / 86_400_000
  )

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'

  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

export function formatChatTimestamp(iso: string): string {
  return `${formatChatDay(iso)} at ${formatChatTime(iso)}`
}

export function formatRelativeTime(iso: string): string {
  const date = new Date(iso)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'

  const minutes = Math.floor(seconds / 60)

  if (minutes < 60) return `${minutes}m`

  const hours = Math.floor(minutes / 60)

  if (hours < 24) return `${hours}h`

  const days = Math.floor(hours / 24)

  if (days < 7) return `${days}d`

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}