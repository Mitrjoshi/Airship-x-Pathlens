import { cn } from '@workspace/ui/lib/utils'
import React from 'react'

export const AppLayout = ({
  className,
  children,
  ...props
}: React.ComponentProps<'main'>) => {
  return (
    <main className={cn('flex flex-1 flex-col', className)} {...props}>
      {children}
    </main>
  )
}
