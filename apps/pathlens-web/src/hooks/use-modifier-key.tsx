import { useEffect, useState } from 'react'
import { Command } from 'lucide-react'

export function useIsMac() {
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    const platform =
      (navigator as any).userAgentData?.platform || navigator.platform || ''
    setIsMac(/mac|iphone|ipad|ipod/i.test(platform))
  }, [])

  return isMac
}

export function ModKey() {
  const isMac = useIsMac()
  return isMac ? (
    <Command className="size-3" aria-label="Command" />
  ) : (
    <>Ctrl+</>
  )
}
