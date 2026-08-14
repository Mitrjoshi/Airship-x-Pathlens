import {
  PageToolbar,
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
} from '@/components/common/project-page'
import {
  getCampaignsOptions,
  type CampaignDevice,
  type CampaignGoalOption,
  type CampaignRange,
  type CampaignRow,
} from '@/queries/campaigns'
import { formatNumber } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  Activity,
  ArrowRight,
  DollarSign,
  Megaphone,
  RefreshCw,
  Target,
  Users,
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/campaigns'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Campaigns',
  },
})

const rangeOptions: { label: string; value: CampaignRange }[] = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

const deviceOptions: { label: string; value: CampaignDevice }[] = [
  { label: 'All devices', value: 'all' },
  { label: 'Desktop', value: 'desktop' },
  { label: 'Mobile', value: 'mobile' },
  { label: 'Tablet', value: 'tablet' },
  { label: 'Unknown', value: 'unknown' },
]

function formatRevenue(value: number | null, unit: string | undefined): string {
  if (value === null || !unit) return 'N/A'

  if (unit === '$') {
    return `$${value.toLocaleString('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })}`
  }

  return `${value.toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })} ${unit}`
}

function formatCampaignValue(value: string | null): string {
  return value || 'Any'
}

function getCampaignLabel(campaign: CampaignRow): string {
  if (campaign.isUnattributed) return 'Unattributed'

  return (
    campaign.utmCampaign ??
    campaign.utmSource ??
    campaign.utmMedium ??
    'Unnamed campaign'
  )
}

function CampaignTuple({ campaign }: { campaign: CampaignRow }) {
  if (campaign.isUnattributed) {
    return <Badge variant="outline">No UTM attribution</Badge>
  }

  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      <Badge variant="secondary">
        {formatCampaignValue(campaign.utmSource)} /{' '}
        {formatCampaignValue(campaign.utmMedium)}
      </Badge>
      {campaign.utmTerm && (
        <Badge variant="outline">term: {campaign.utmTerm}</Badge>
      )}
      {campaign.utmContent && (
        <Badge variant="outline">content: {campaign.utmContent}</Badge>
      )}
    </div>
  )
}

function MetricValue({ value, detail }: { value: string; detail: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-1 text-xs">{detail}</p>
    </div>
  )
}

function CampaignStage({
  label,
  value,
  detail,
  icon: Icon,
  isLast,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Megaphone
  isLast: boolean
}) {
  return (
    <div className="relative flex min-w-0 items-center gap-2">
      <Card className="min-w-0 flex-1">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="bg-primary/10 text-primary rounded-lg p-2">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-muted-foreground truncate text-xs font-medium">
              {label}
            </p>
            <MetricValue value={value} detail={detail} />
          </div>
        </CardContent>
      </Card>
      {!isLast && (
        <ArrowRight className="text-muted-foreground hidden size-4 shrink-0 xl:block" />
      )}
    </div>
  )
}

function GoalDescription({ goal }: { goal: CampaignGoalOption | null }) {
  if (!goal) {
    return (
      <span>Configure a project goal to measure conversions and revenue.</span>
    )
  }

  return (
    <span>
      Conversion attribution for{' '}
      <span className="font-medium">{goal.name}</span>
      {' · '}
      {goal.type === 'revenue'
        ? `Revenue in ${goal.unit}`
        : 'Unique converting visitors'}
    </span>
  )
}

function CampaignTable({
  campaigns,
  goal,
}: {
  campaigns: CampaignRow[]
  goal: CampaignGoalOption | null
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-[28%] px-5">Campaign</TableHead>
            <TableHead>Visitors</TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead>Conversion</TableHead>
            <TableHead>Revenue</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow key={campaign.key}>
              <TableCell className="px-5">
                <p className="font-medium">{getCampaignLabel(campaign)}</p>
                <CampaignTuple campaign={campaign} />
              </TableCell>
              <TableCell>
                <p className="font-medium">{formatNumber(campaign.visitors)}</p>
                <p className="text-muted-foreground text-xs">
                  {formatNumber(campaign.sessions)} sessions
                </p>
              </TableCell>
              <TableCell>
                <p className="font-medium">
                  {formatNumber(campaign.engagedVisitors)}
                </p>
                <p className="text-muted-foreground text-xs">
                  {campaign.engagementRate}% engaged
                </p>
              </TableCell>
              <TableCell>
                {campaign.convertedVisitors === null ? (
                  <span className="text-muted-foreground">N/A</span>
                ) : (
                  <>
                    <p className="font-medium">
                      {formatNumber(campaign.convertedVisitors)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {campaign.conversionRate}% conversion
                    </p>
                  </>
                )}
              </TableCell>
              <TableCell className="font-medium">
                {formatRevenue(campaign.revenue, goal?.unit)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const [range, setRange] = useState<CampaignRange>('30d')
  const [device, setDevice] = useState<CampaignDevice>('all')
  const [goalId, setGoalId] = useState('')
  const [page, setPage] = useState(1)

  const { data, isError, isFetching, isPending, refetch } = useQuery(
    getCampaignsOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      device,
      goal_id: goalId || undefined,
      page,
      page_size: 50,
    })
  )
  const campaignData = data?.data
  const summary = campaignData?.summary
  const selectedGoal = campaignData?.selectedGoal ?? null
  const goalOptions = campaignData?.goals ?? []
  const goalSelectValue = selectedGoal?.id ?? (goalOptions[0]?.id || 'none')

  const stages = [
    {
      label: 'Campaigns',
      value: formatNumber(summary?.campaignCount ?? 0),
      detail: 'UTM groups',
      icon: Megaphone,
    },
    {
      label: 'Visitors',
      value: formatNumber(summary?.visitors ?? 0),
      detail: 'Unique visitors',
      icon: Users,
    },
    {
      label: 'Engagement',
      value: formatNumber(summary?.engagedVisitors ?? 0),
      detail: `${summary?.engagementRate ?? 0}% engaged`,
      icon: Activity,
    },
    {
      label: 'Conversion',
      value:
        summary?.convertedVisitors === null ||
        summary?.convertedVisitors === undefined
          ? 'N/A'
          : formatNumber(summary.convertedVisitors),
      detail:
        summary?.conversionRate === null ||
        summary?.conversionRate === undefined
          ? 'Select a goal'
          : `${summary.conversionRate}% conversion`,
      icon: Target,
    },
    {
      label: 'Revenue',
      value: formatRevenue(summary?.revenue ?? null, selectedGoal?.unit),
      detail:
        selectedGoal?.type === 'revenue'
          ? selectedGoal.unit
          : 'Revenue goal only',
      icon: DollarSign,
    },
  ]

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Acquisition · Attribution"
          title="Campaigns"
          description="Follow first-touch UTM campaigns from the visitors they bring through engagement, conversion, and revenue."
          actions={
            <Button
              variant="outline"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={isFetching ? 'animate-spin' : undefined} />
              Refresh campaigns
            </Button>
          }
        />

        <PageToolbar className="bg-muted/20 flex-wrap rounded-xl border p-3">
          <div className="text-muted-foreground mr-auto flex items-center gap-2 text-xs">
            <Megaphone className="size-4" />
            First-touch attribution
          </div>
          <Select
            value={goalSelectValue}
            disabled={isPending || goalOptions.length === 0}
            onValueChange={(value) => {
              if (value && value !== 'none') {
                setGoalId(value)
                setPage(1)
              }
            }}
          >
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Conversion goal" />
            </SelectTrigger>
            <SelectContent>
              {goalOptions.length === 0 ? (
                <SelectItem value="none">No goals configured</SelectItem>
              ) : (
                goalOptions.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <Select
            value={device}
            onValueChange={(value) => {
              setDevice(value as CampaignDevice)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {deviceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={range}
            onValueChange={(value) => {
              setRange(value as CampaignRange)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PageToolbar>

        {isError && (
          <p className="text-destructive text-sm">
            Unable to load campaign analytics for this project.
          </p>
        )}

        <div className="grid gap-3 xl:grid-cols-5">
          {stages.map((stage, index) => (
            <CampaignStage
              key={stage.label}
              label={stage.label}
              value={stage.value}
              detail={stage.detail}
              icon={stage.icon}
              isLast={index === stages.length - 1}
            />
          ))}
        </div>

        <ProjectMetricStrip className="lg:grid-cols-4">
          <ProjectMetric
            label="Sessions"
            value={formatNumber(summary?.sessions ?? 0)}
            detail="Campaign-attributed sessions"
            isLoading={isPending}
          />
          <ProjectMetric
            label="Engaged sessions"
            value={formatNumber(summary?.engagedSessions ?? 0)}
            detail="Composite engagement rule"
            isLoading={isPending}
          />
          <ProjectMetric
            label="Selected goal"
            value={selectedGoal?.name ?? 'None'}
            detail={<GoalDescription goal={selectedGoal} />}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Revenue"
            value={formatRevenue(summary?.revenue ?? null, selectedGoal?.unit)}
            detail={
              selectedGoal?.type === 'revenue'
                ? 'Matching revenue events'
                : 'Not applicable for this goal'
            }
            icon={DollarSign}
            isLoading={isPending}
          />
        </ProjectMetricStrip>

        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Campaign performance</CardTitle>
                <CardDescription>
                  <GoalDescription goal={selectedGoal} />
                </CardDescription>
              </div>
              <Badge variant="outline">
                {formatNumber(campaignData?.pagination.total ?? 0)} campaigns
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isPending ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : campaignData?.campaigns.length ? (
              <CampaignTable
                campaigns={campaignData.campaigns}
                goal={selectedGoal}
              />
            ) : (
              <div className="text-muted-foreground px-5 py-16 text-center text-sm">
                No campaign activity matched the selected filters.
              </div>
            )}
          </CardContent>
          {campaignData && campaignData.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-5 py-3">
              <span className="text-muted-foreground text-xs">
                Page {campaignData.pagination.page} of{' '}
                {campaignData.pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1 || isFetching}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!campaignData.pagination.hasNextPage || isFetching}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </ProjectPageLayout>
  )
}
