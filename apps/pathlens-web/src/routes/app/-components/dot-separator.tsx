import { cn } from '@workspace/ui'
import type { ComponentProps } from 'react'

function DotSeparator({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center [&>*:not(:last-child)]:after:mx-2 [&>*:not(:last-child)]:after:content-['•']",
        className
      )}
      {...props}
    />
  )
}

function DotSeparatorItem({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex items-center', className)} {...props} />
}

export { DotSeparator, DotSeparatorItem }
