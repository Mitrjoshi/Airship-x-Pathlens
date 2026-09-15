import {
  ProjectPageHeader,
  ProjectPanel,
} from '@/components/common/project-page'
import { PageLayout } from '@/components/common/page-layout'
import { getProjectsOptions } from '@/queries/projects'
import { getUsageOptions } from '@/queries/usage'
import { navigationIcons } from '@/config/navigation-icons'
import { formatNumber } from '@/utils/utils'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  CardContent,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Progress } from '@workspace/ui/components/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { cn } from '@workspace/ui/lib/utils'
import type { LucideIcon } from 'lucide-react'
import { Database, Globe, ShieldCheck } from 'lucide-react'
import { Label } from '@workspace/ui/components/label'

export const Route = createFileRoute('/app/$workspace/usage')({
  component: RouteComponent,
  validateSearch: z.object({ project_id: z.string().optional() }),
  staticData: { breadcrumb: 'Usage' },
})

type UsageMetric = {
  label: string
  icon: LucideIcon
  used: number
  limit: number
}

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let index = -1
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index++
  }
  return `${Number(value.toFixed(value < 10 ? 1 : 0))} ${units[index]}`
}

function RouteComponent() {
  const { workspace } = Route.useParams()
  const { project_id: projectId } = Route.useSearch()
  const navigate = Route.useNavigate()
  const { data: projectsData } = useQuery(
    getProjectsOptions({ workspace_id: workspace })
  )
  const { data, isPending, isError } = useQuery(
    getUsageOptions(workspace, projectId)
  )
  const usage = data?.data
  const selectedProject = projectsData?.data.find(
    (project) => project.id === projectId
  )
  const breakdown = projectId
    ? usage?.projectBreakdown.find((project) => project.projectId === projectId)
    : undefined
  const values = projectId
    ? {
        pageViews: breakdown?.pageViews ?? 0,
        events: breakdown?.events ?? 0,
        recordings: breakdown?.recordings ?? 0,
        heatmapPages: breakdown?.heatmapPages ?? 0,
        funnels: breakdown?.funnels ?? 0,
        goals: breakdown?.goals ?? 0,
      }
    : usage?.usage

  const metrics: UsageMetric[] = usage?.limits
    ? [
        ['Page Views', Globe, values?.pageViews ?? 0, usage.limits.pageViews],
        [
          'Events',
          navigationIcons.events,
          values?.events ?? 0,
          usage.limits.events,
        ],
        [
          'Recordings',
          navigationIcons.sessionReplay,
          values?.recordings ?? 0,
          usage.limits.recordings,
        ],
        [
          'Heatmap Pages',
          navigationIcons.heatmaps,
          values?.heatmapPages ?? 0,
          usage.limits.heatmapPages,
        ],
        [
          'Projects',
          navigationIcons.projects,
          usage.usage.projects,
          usage.limits.projects,
        ],
        [
          'Funnels',
          navigationIcons.funnels,
          values?.funnels ?? usage.usage.funnels,
          usage.limits.funnels,
        ],
        [
          'Goals',
          navigationIcons.goals,
          values?.goals ?? usage.usage.goals,
          usage.limits.goals,
        ],
      ].map(([label, icon, used, limit]) => ({
        label: label as string,
        icon: icon as LucideIcon,
        used: used as number,
        limit: limit as number,
      }))
    : []

  const maxPercent = Math.max(
    0,
    ...metrics.map((metric) => Math.round((metric.used / metric.limit) * 100))
  )

  return (
    <PageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Workspace"
          title="Usage."
          description="Lifetime usage across this workspace and its projects."
          actions={
            <Label className="flex items-center gap-2 text-sm">
              <Select
                value={projectId ?? 'all'}
                onValueChange={(value) =>
                  navigate({
                    search: {
                      project_id: value === 'all' ? undefined : value,
                    },
                  })
                }
              >
                <SelectTrigger
                  className="bg-background h-9 max-w-52 text-sm"
                  aria-label="Filter usage by project"
                >
                  <SelectValue>
                    {selectedProject?.name ?? 'All projects'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {(projectsData?.data ?? []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Label>
          }
        />

        {usage?.accountLifetimeAccess ? (
          <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-700">
            Lifetime account access is active. Workspace usage limits still
            apply independently.
          </div>
        ) : (
          <div className="bg-muted/40 flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Need more usage?</p>
              <p className="text-muted-foreground mt-1 text-xs">
                Get lifetime account access. Workspace usage limits still apply.
              </p>
            </div>
            <Button size="sm" render={<Link to="/app/billing" />}>
              View billing
            </Button>
          </div>
        )}

        {selectedProject && (
          <div className="bg-muted/40 rounded-xl border px-4 py-3 text-sm">
            Showing <span className="font-medium">{selectedProject.name}</span>{' '}
            against the shared workspace limits.
          </div>
        )}

        {isError ? (
          <div
            role="alert"
            className="text-destructive rounded-xl border border-dashed px-5 py-4 text-sm"
          >
            Unable to load usage for this workspace. Refresh the page and try
            again.
          </div>
        ) : null}

        <ProjectPanel>
          <CardHeader className="px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-xl">
                <ShieldCheck className="size-4" />
              </span>
              <div>
                <CardTitle>Workspace limits</CardTitle>
                <p className="text-muted-foreground mt-1 text-sm">
                  Limits are shared across the workspace and do not reset.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 px-5 pb-5 sm:grid-cols-3 sm:px-6">
            {isPending
              ? Array.from({ length: 7 }).map((_, index) => (
                  <div
                    key={index}
                    className="bg-muted/40 h-24 animate-pulse rounded-xl"
                  />
                ))
              : metrics.map((metric) => {
                  const Icon = metric.icon
                  const percent = Math.min(
                    100,
                    Math.round((metric.used / metric.limit) * 100)
                  )
                  return (
                    <div key={metric.label} className="rounded-xl border p-4">
                      <div className="flex items-center gap-3">
                        <span className="bg-muted text-muted-foreground flex size-9 items-center justify-center rounded-lg">
                          <Icon className="size-4" />
                        </span>
                        <div>
                          <p className="text-sm font-medium">{metric.label}</p>
                          <p className="text-muted-foreground mt-1 text-xs">
                            {formatNumber(metric.used)} of{' '}
                            {formatNumber(metric.limit)}
                          </p>
                        </div>
                      </div>
                      <Progress
                        value={percent}
                        className={cn(
                          'mt-4',
                          percent >= 90 && '[&>div]:bg-destructive'
                        )}
                      />
                    </div>
                  )
                })}
          </CardContent>
        </ProjectPanel>

        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
              Status
            </p>
            <p className="mt-2 text-sm">
              {usage?.status === 'paused'
                ? 'Workspace paused'
                : usage?.status === 'warning'
                  ? `Grace period ends ${usage.pauseAt ? new Date(usage.pauseAt).toLocaleDateString() : 'soon'}`
                  : 'Usage active'}
            </p>
          </div>
          <Badge variant={maxPercent >= 90 ? 'destructive' : 'outline'}>
            {isPending ? 'Loading' : `${maxPercent}% used`}
          </Badge>
        </div>

        {usage && (
          <div className="text-muted-foreground flex items-center gap-3 text-sm">
            <Database className="size-4" />
            {formatBytes(usage.usage.storageBytes)} of replay data stored
          </div>
        )}
      </div>
    </PageLayout>
  )
}
