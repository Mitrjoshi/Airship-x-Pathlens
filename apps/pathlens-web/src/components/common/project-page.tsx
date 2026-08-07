import { AppLayout } from '@/components/common/app-layout'
import { Card } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'
import type { LucideIcon } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'

export function ProjectPageLayout({
  className,
  children,
  ...props
}: ComponentProps<'main'>) {
  return (
    <AppLayout
      className={cn('mx-auto w-full max-w-6xl gap-0 p-5 sm:p-8', className)}
      {...props}
    >
      {children}
    </AppLayout>
  )
}

export function ProjectPageHeader({
  eyebrow = 'Project overview',
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.18em] uppercase">
          <span className="bg-foreground size-1.5 rounded-full" />
          {eyebrow}
        </div>
        <h1 className="mt-4 text-4xl leading-none font-semibold tracking-[-0.04em] sm:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-4 max-w-lg text-sm leading-6">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function ProjectMetricStrip({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'grid divide-y border-y sm:grid-cols-2 sm:divide-x sm:divide-y-0',
        className
      )}
    >
      {children}
    </div>
  )
}

export function ProjectMetric({
  label,
  value,
  icon: Icon,
  detail,
  isLoading = false,
}: {
  label: string
  value: ReactNode
  icon?: LucideIcon
  detail?: ReactNode
  isLoading?: boolean
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 px-4 py-5 first:pl-0 last:pr-0 sm:px-5">
      <div className="min-w-0">
        <p className="text-muted-foreground truncate text-xs">{label}</p>
        {isLoading ? (
          <Skeleton className="mt-1 h-6 w-16" />
        ) : (
          <p className="mt-1 truncate text-lg font-semibold tracking-tight">
            {value}
          </p>
        )}
        {detail && !isLoading && (
          <div className="text-muted-foreground mt-1 truncate text-xs">
            {detail}
          </div>
        )}
      </div>
      {Icon && <Icon className="text-muted-foreground size-4 shrink-0" />}
    </div>
  )
}

export function ProjectPanel({
  className,
  ...props
}: ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        'gap-0 overflow-hidden rounded-2xl border py-0 shadow-none',
        className
      )}
      {...props}
    />
  )
}
