import type { ReactNode } from 'react'

import {
  MarketingHeader,
  type MarketingNavKey,
} from '@/components/marketing/marketing-header'
import { MarketingFooter } from '@/components/marketing/marketing-footer'

export function MarketingShell({
  active,
  children,
}: {
  active?: MarketingNavKey
  children: ReactNode
}) {
  return (
    <main className="bg-background min-h-screen overflow-x-hidden scroll-smooth">
      <MarketingHeader active={active} />
      {children}
      <MarketingFooter />
    </main>
  )
}
