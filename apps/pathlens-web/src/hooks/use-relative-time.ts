import { useEffect, useState } from 'react'

export const useRelativeTime = (
  timestamp?: number | string | Date,
  interval = 1000
) => {
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!timestamp) return

    const timer = setInterval(() => {
      setTick((prev) => prev + 1)
    }, interval)

    return () => clearInterval(timer)
  }, [timestamp, interval])

  if (!timestamp) return ''

  const date = new Date(timestamp).getTime()
  const seconds = Math.floor((Date.now() - date) / 1000)

  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`

  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`

  const years = Math.floor(days / 365)
  return `${years}y ago`
}
