import { cn } from '@workspace/ui'
import type { ComponentProps } from 'react'

export const DotLayout = ({
  children,
  className,
  ...props
}: ComponentProps<'div'>) => {
  return (
    <div className={cn('dotted-background w-full', className)} {...props}>
      {children}
    </div>
  )
}
