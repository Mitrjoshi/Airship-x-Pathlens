import {
  ProjectPageHeader,
  ProjectPanel,
} from '@/components/common/project-page'
import { PageLayout } from '@/components/common/page-layout'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Progress } from '@workspace/ui/components/progress'
import { cn } from '@workspace/ui/lib/utils'
import { getPlanDefinition, useWorkspacePlan } from '@/lib/billing'
import { getUsageOptions } from '@/queries/usage'
import { navigationIcons } from '@/config/navigation-icons'
import { formatDate, formatNumber } from '@/utils/utils'
import type { LucideIcon } from 'lucide-react'
import {
  CalendarDays,
  Database,
  Globe,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

export const Route = createFileRoute('/app/$workspace/usage')({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Usage',
  },
})

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`

  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unitIndex = -1

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex++
  }

  return `${Number(value.toFixed(value < 10 ? 1 : 0))} ${units[unitIndex]}`
}

type UsageMetric = {
  label: string
  icon: LucideIcon
  used: number
  limit: number | null
  enforcement: 'enforced' | 'advisory'
}

function RouteComponent() {
  const { workspace } = Route.useParams()
  const currentPlanId = useWorkspacePlan(workspace)
  const currentPlan = getPlanDefinition(currentPlanId)
  const { data, isPending, isError } = useQuery(getUsageOptions(workspace))
  const usage = data?.data
  const used = usage?.usage

  const metrics: UsageMetric[] = [
    {
      label: 'Page Views',
      icon: Globe,
      used: used?.pageViews ?? 0,
      limit: currentPlan.limits.pageViews,
      enforcement: 'advisory',
    },
    {
      label: 'Events',
      icon: navigationIcons.events,
      used: used?.events ?? 0,
      limit: currentPlan.limits.events,
      enforcement: 'advisory',
    },
    {
      label: 'Session Recordings',
      icon: navigationIcons.sessionReplay,
      used: used?.recordings ?? 0,
      limit: currentPlan.limits.sessionRecordings,
      enforcement: 'advisory',
    },
    {
      label: 'Projects',
      icon: navigationIcons.projects,
      used: used?.projects ?? 0,
      limit: currentPlan.limits.projects,
      enforcement: 'enforced',
    },
    {
      label: 'Members',
      icon: navigationIcons.members,
      used: used?.members ?? 0,
      limit: currentPlan.limits.members,
      enforcement: 'enforced',
    },
    {
      label: 'Funnels',
      icon: navigationIcons.funnels,
      used: used?.funnels ?? 0,
      limit: currentPlan.limits.funnels,
      enforcement: 'advisory',
    },
    {
      label: 'Goals',
      icon: navigationIcons.goals,
      used: used?.goals ?? 0,
      limit: currentPlan.limits.goals,
      enforcement: 'advisory',
    },
    {
      label: 'Workspaces',
      icon: navigationIcons.projects,
      used: used?.workspaces ?? 0,
      limit: currentPlan.limits.workspaces,
      enforcement: 'enforced',
    },
  ]

  const maxPercent = Math.max(
    0,
    ...metrics.map((metric) =>
      metric.limit === null ? 0 : Math.round((metric.used / metric.limit) * 100)
    )
  )
  const resetDate = usage?.period.end

  return (
    <PageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Workspace"
          title="Usage."
          description="How much of your plan you are using this period, and what happens when you hit a limit."
          actions={
            <Badge variant="outline" className="w-fit">
              {currentPlan.name} plan ·{' '}
              {currentPlan.price === 0 ? 'No renewal' : 'Monthly'}
            </Badge>
          }
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
          <ProjectPanel>
            <CardContent className="p-5 pt-6 sm:p-6 sm:pt-7">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.16em] uppercase">
                    <Sparkles className="size-3.5" />
                    Current plan
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    <h2 className="text-2xl font-semibold tracking-tight">
                      {currentPlan.name}
                    </h2>
                    <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/15">
                      Active
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-6">
                    {currentPlan.description}
                  </p>
                </div>

                <div className="sm:text-right">
                  <p className="text-muted-foreground text-xs">Current rate</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight">
                    {currentPlan.price === 0 ? 'Free' : `$${currentPlan.price}`}
                    {currentPlan.price > 0 && (
                      <span className="text-muted-foreground text-sm font-normal">
                        /mo
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 border-t pt-5 sm:grid-cols-3">
                <div>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <CalendarDays className="size-3.5" />
                    Reset date
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {isPending || !resetDate
                      ? '—'
                      : currentPlan.price === 0
                        ? 'No renewal'
                        : formatDate(resetDate)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="size-3.5" />
                    Data retention
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {currentPlan.limits.retentionDays} days
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <TrendingUp className="size-3.5" />
                    Peak usage
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {isPending ? '—' : `${maxPercent}% of limit`}
                  </p>
                </div>
              </div>
            </CardContent>
          </ProjectPanel>

          <ProjectPanel className="bg-muted/30">
            <CardHeader className="px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="bg-background text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl border">
                  <ShieldCheck className="size-4" />
                </span>
                <div>
                  <CardTitle>How limits work</CardTitle>
                  <CardDescription className="mt-1">
                    What happens when you reach a limit.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="bg-background rounded-xl border p-4 text-sm">
                <Badge className="border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/10">
                  Enforced
                </Badge>
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  Projects, members, and workspaces are blocked from being
                  created once the limit is reached.
                </p>
              </div>
              <div className="bg-background rounded-xl border p-4 text-sm">
                <Badge variant="outline">Advisory</Badge>
                <p className="text-muted-foreground mt-2 text-xs leading-5">
                  Page views, events, funnels, goals, and recordings continue to
                  work, but you are shown a notice with an upgrade prompt.
                </p>
              </div>
            </CardContent>
          </ProjectPanel>
        </div>

        {isError ? (
          <div
            role="alert"
            className="text-destructive rounded-xl border border-dashed px-5 py-4 text-sm"
          >
            Unable to load usage for this workspace. Refresh the page and try
            again.
          </div>
        ) : null}

        {!isPending && maxPercent >= 90 && (
          <div className="bg-muted/40 flex flex-col gap-3 rounded-xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">
              You have used {maxPercent}% of your {currentPlan.name} plan limits
              this period. Upgrade for more room.
            </p>
            <Button
              size="sm"
              className="shrink-0"
              render={
                <Link to="/app/$workspace/billing" params={{ workspace }} />
              }
            >
              Upgrade plan
            </Button>
          </div>
        )}

        <section className="space-y-4">
          <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                Usage this period
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                How you are tracking against your limits.
              </h2>
            </div>
            <Badge variant="outline" className="w-fit">
              {currentPlan.price === 0
                ? 'No renewal'
                : `Resets ${resetDate ? formatDate(resetDate) : '—'}`}
            </Badge>
          </div>

          {isPending ? (
            <div className="grid gap-4 md:grid-cols-2">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="bg-muted/40 animate-pulse rounded-xl border p-4"
                >
                  <div className="bg-muted h-4 w-24 rounded" />
                  <div className="bg-muted mt-3 h-8 w-16 rounded" />
                  <div className="bg-muted mt-4 h-2 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {metrics.map((metric) => {
                const Icon = metric.icon
                const percent =
                  metric.limit === null
                    ? 0
                    : Math.min(
                        100,
                        Math.round((metric.used / metric.limit) * 100)
                      )
                const isUnlimited = metric.limit === null

                return (
                  <div key={metric.label} className="rounded-xl border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {metric.label}
                          </p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {formatNumber(metric.used)} of{' '}
                            {isUnlimited
                              ? 'Unlimited'
                              : formatNumber(metric.limit)}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        {isUnlimited ? (
                          <span className="text-muted-foreground text-xs">
                            Unlimited
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs tabular-nums">
                            {percent}%
                          </span>
                        )}
                        <Badge
                          variant={
                            metric.enforcement === 'enforced'
                              ? 'outline'
                              : 'secondary'
                          }
                          className={cn(
                            metric.enforcement === 'enforced' &&
                              'border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/10'
                          )}
                        >
                          {metric.enforcement === 'enforced'
                            ? 'Enforced'
                            : 'Advisory'}
                        </Badge>
                      </div>
                    </div>
                    {!isUnlimited && (
                      <Progress
                        value={percent}
                        className={cn(
                          'mt-4',
                          percent >= 90 && '[&>div]:bg-destructive'
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
              Storage
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Replay data footprint.
            </h2>
          </div>

          <ProjectPanel>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Database className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">Storage Used</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {isPending
                      ? '—'
                      : `${formatBytes(used?.storageBytes ?? 0)} of session replay data stored`}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground text-xs leading-5">
                No storage limit applies on your {currentPlan.name} plan.
              </p>
            </CardContent>
          </ProjectPanel>
        </section>
      </div>
    </PageLayout>
  )
}
