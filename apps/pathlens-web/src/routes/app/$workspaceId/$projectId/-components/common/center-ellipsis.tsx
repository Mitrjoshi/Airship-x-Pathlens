import { useMemo } from 'react'

interface CenterEllipsisProps {
  text: string
  maxLength?: number
  className?: string
}

export function CenterEllipsis({
  text,
  maxLength = 24,
  className = '',
}: CenterEllipsisProps) {
  const truncated = useMemo(() => {
    if (text.length <= maxLength) return text

    const available = Math.max(2, maxLength - 3)
    const start = Math.ceil(available / 2)
    const end = Math.floor(available / 2)

    return `${text.slice(0, start)}...${text.slice(-end)}`
  }, [text, maxLength])

  return (
    <span title={text} className={`block min-w-0 truncate ${className}`}>
      {truncated}
    </span>
  )
}
