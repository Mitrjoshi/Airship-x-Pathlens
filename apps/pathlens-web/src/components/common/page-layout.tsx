import { AppLayout } from '@/components/common/app-layout'
import { Card } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { cn } from '@workspace/ui/lib/utils'
import type { ComponentProps, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

type PageLayoutProps = ComponentProps<'main'>

export function PageLayout({ className, children, ...props }: PageLayoutProps) {
  return (
    <AppLayout
      className={cn(
        'mx-auto min-h-svh w-full max-w-6xl gap-8 px-5 py-6 sm:px-8 sm:py-8',
        className
      )}
      {...props}
    >
      {children}
    </AppLayout>
  )
}

export function PageHeader({
  eyebrow = 'Overview',
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex min-h-24 flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.18em] uppercase">
          <span className="bg-foreground size-1.5 shrink-0 rounded-full" />
          {eyebrow}
        </div>
        <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-[-0.04em] sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm leading-6">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {actions}
        </div>
      )}
    </header>
  )
}

export function PageToolbar({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      {children}
    </div>
  )
}

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base leading-snug font-medium">{title}</h2>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm leading-6">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function MetricStrip({
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

export function Metric({
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

export function PagePanel({
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
