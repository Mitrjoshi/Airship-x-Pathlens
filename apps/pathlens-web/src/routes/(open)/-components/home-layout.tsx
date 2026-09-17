import { cn } from '@workspace/ui'
import type { ComponentProps } from 'react'

export const HomeLayout = ({
  children,
  className,
  ...props
}: ComponentProps<'div'>) => {
  return (
    <div className={cn('mx-auto w-full max-w-[90vw]', className)} {...props}>
      {children}
    </div>
  )
}
