import type {
  DashboardIntegration,
  GoogleSearchConsoleDashboardData,
  PageSpeedDashboardData,
  StripeDashboardData,
} from '@workspace/contracts'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { AlertCircleIcon, PlayIcon, RefreshCcwIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'

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
import { formatDate, formatNumber } from '@/utils/utils'
import type { DashboardRange } from '@/queries/dashboard'
import {
  getGoogleSearchConsoleDashboardOptions,
  getPageSpeedDashboardOptions,
  getStripeDashboardOptions,
} from '@/queries/dashboard-integrations'

type Props = {
  integrations: DashboardIntegration[]
  workspaceId: string
  projectId: string
  domain: string
  range: DashboardRange
}

const strategies = [
  { label: 'Mobile', value: 'mobile' },
  { label: 'Desktop', value: 'desktop' },
]

const providerNames: Record<string, string> = {
  'google-search-console': 'Google Search Console',
  stripe: 'Stripe',
  'pagespeed-insights': 'Google PageSpeed Insights',
}

export function DashboardIntegrationSection(props: Props) {
  const available = props.integrations.filter(
    (integration) =>
      integration.status === 'connected' &&
      integration.dashboardApiAvailable &&
      providerNames[integration.provider]
  )

  if (available.length === 0) return null

  return (
    <section className="mx-auto space-y-4 p-6">
      <div>
        <p className="text-xl font-medium">Connected integrations</p>
        <p className="text-muted-foreground text-sm">
          Provider analytics are loaded independently from your Pathlens data.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {available.map((integration) => {
          if (integration.provider === 'google-search-console') {
            return <SearchConsoleWidget key={integration.provider} {...props} />
          }
          if (integration.provider === 'stripe') {
            return <StripeWidget key={integration.provider} {...props} />
          }
          return <PageSpeedWidget key={integration.provider} {...props} />
        })}
      </div>
    </section>
  )
}

function ProviderCard({
  provider,
  iconUrl,
  children,
  description,
}: {
  provider: string
  iconUrl?: string | null
  children: ReactNode
  description?: string
}) {
  return (
    <Card className="bg-card/30 h-fit rounded-none border-2 border-dashed p-0">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {iconUrl && (
            <img
              src={iconUrl}
              alt=""
              className="size-5 rounded object-contain"
            />
          )}
          {providerNames[provider]}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-4 pt-2">{children}</CardContent>
    </Card>
  )
}

function WidgetError({
  error,
  onRetry,
  workspaceId,
  projectId,
}: {
  error: unknown
  onRetry: () => void
  workspaceId: string
  projectId: string
}) {
  const navigate = useNavigate()
  const status = getErrorStatus(error)
  const message =
    status === 401 || status === 403 || status === 404
      ? 'This integration needs to be reconnected.'
      : status === 429
        ? 'The provider is rate limiting requests. Try again shortly.'
        : 'The provider data could not be loaded.'

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border p-3">
      <div className="flex items-center gap-2 text-sm">
        <AlertCircleIcon className="text-destructive size-4" />
        <span>{message}</span>
      </div>
      <div className="flex items-center gap-2">
        {(status === 401 || status === 403 || status === 404) && (
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              navigate({
                to: '/app/$workspaceId/$projectId/integrations',
                params: { workspaceId, projectId },
              })
            }
          >
            Reconnect
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onRetry}>
          <RefreshCcwIcon /> Retry
        </Button>
      </div>
    </div>
  )
}

function SearchConsoleWidget({
  workspaceId,
  projectId,
  domain,
  range,
  integrations,
}: Props) {
  const integration = integrations.find(
    (item) => item.provider === 'google-search-console'
  )
  const query = useQuery(
    getGoogleSearchConsoleDashboardOptions({
      workspaceId,
      projectId,
      domain,
      range,
    })
  )
  const data = query.data?.data

  return (
    <ProviderCard
      provider="google-search-console"
      iconUrl={integration?.iconUrl}
      description="Search performance for the selected domain and period."
    >
      {query.isLoading ? (
        <WidgetSkeleton />
      ) : query.error ? (
        <WidgetError
          error={query.error}
          onRetry={() => query.refetch()}
          workspaceId={workspaceId}
          projectId={projectId}
        />
      ) : data ? (
        <SearchConsoleResults data={data} />
      ) : (
        <EmptyWidget />
      )}
    </ProviderCard>
  )
}

function SearchConsoleResults({
  data,
}: {
  data: GoogleSearchConsoleDashboardData
}) {
  const metrics = [
    ['Clicks', formatNumber(data.summary.clicks)],
    ['Impressions', formatNumber(data.summary.impressions)],
    ['CTR', `${(data.summary.ctr * 100).toFixed(1)}%`],
    ['Avg. position', data.summary.position.toFixed(1)],
  ]

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-xs">
        {data.period.startDate} to {data.period.endDate} ({data.period.timezone}
        )
      </p>
      <MetricGrid metrics={metrics} />
      <div className="grid gap-4 md:grid-cols-2">
        <RankedList
          title="Top queries"
          rows={data.topQueries.map((item) => [item.query, item.clicks])}
        />
        <RankedList
          title="Top pages"
          rows={data.topPages.map((item) => [item.page, item.clicks])}
        />
      </div>
    </div>
  )
}

function StripeWidget({ workspaceId, projectId, range, integrations }: Props) {
  const integration = integrations.find((item) => item.provider === 'stripe')
  const [requested, setRequested] = useState(false)
  const query = useQuery(
    getStripeDashboardOptions({
      workspaceId,
      projectId,
      range,
      enabled: requested,
    })
  )
  const data = query.data?.data

  return (
    <ProviderCard
      provider="stripe"
      iconUrl={integration?.iconUrl}
      description="Revenue and payment activity."
    >
      {!requested ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            Load Stripe analytics for the selected period.
          </p>
          <Button onClick={() => setRequested(true)}>
            <PlayIcon /> Load analytics
          </Button>
        </div>
      ) : query.isLoading ? (
        <WidgetSkeleton />
      ) : query.error ? (
        <WidgetError
          error={query.error}
          onRetry={() => query.refetch()}
          workspaceId={workspaceId}
          projectId={projectId}
        />
      ) : data ? (
        <StripeResults data={data} />
      ) : (
        <EmptyWidget />
      )}
    </ProviderCard>
  )
}

function StripeResults({ data }: { data: StripeDashboardData }) {
  const currencies = Array.from(
    new Set(
      Object.keys(data.revenue.gross).concat(Object.keys(data.revenue.refunds))
    )
  )
  const [currency, setCurrency] = useState(currencies[0] ?? '')
  const money = (values: Record<string, number>) =>
    formatMoney(values[currency] ?? 0, currency)
  const metrics = [
    ['Gross revenue', money(data.revenue.gross)],
    ['Refunds', money(data.revenue.refunds)],
    ['Net revenue', money(data.revenue.netAfterRefunds)],
    ['Successful payments', formatNumber(data.payments.successfulCharges)],
    ['Failed payments', formatNumber(data.payments.failedPaymentIntents)],
    ['Active subscriptions', formatNumber(data.subscriptions.active)],
    ['Canceled subscriptions', formatNumber(data.subscriptions.canceled)],
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">
          {formatDate(data.period.start)} to {formatDate(data.period.end)}
        </p>
        {currencies.length > 0 && (
          <Select
            value={currency}
            onValueChange={(value) => value && setCurrency(value)}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currencies.map((item) => (
                <SelectItem key={item} value={item}>
                  {item.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <MetricGrid metrics={metrics} />
      <div>
        <p className="mb-2 text-sm font-medium">Revenue trend</p>
        <div className="flex h-20 items-end gap-1">
          {data.revenueByDay.length === 0 ? (
            <EmptyWidget />
          ) : (
            data.revenueByDay.map((day) => {
              const max = Math.max(
                ...data.revenueByDay.map((item) => item.gross[currency] ?? 0),
                1
              )
              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${money(day.gross)}`}
                  className="bg-chart-1 min-w-1 flex-1"
                  style={{
                    height: `${Math.max(((day.gross[currency] ?? 0) / max) * 100, 4)}%`,
                  }}
                />
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

function PageSpeedWidget({
  workspaceId,
  projectId,
  domain,
  integrations,
}: Props) {
  const integration = integrations.find(
    (item) => item.provider === 'pagespeed-insights'
  )
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile')
  const [requested, setRequested] = useState(false)
  const query = useQuery(
    getPageSpeedDashboardOptions({
      workspaceId,
      projectId,
      domain,
      strategy,
      enabled: requested,
    })
  )
  const data = query.data?.data

  return (
    <ProviderCard
      provider="pagespeed-insights"
      iconUrl={integration?.iconUrl}
      description="Run a point-in-time Lighthouse audit."
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <Select
          items={strategies}
          value={strategy}
          onValueChange={(value) => {
            if (!value) return

            setStrategy(value as 'mobile' | 'desktop')
            setRequested(false)
          }}
        >
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>

          <SelectContent>
            {strategies.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setRequested(true)} disabled={query.isFetching}>
          {data ? 'Run again' : 'Run audit'}
        </Button>
      </div>
      {!requested ? (
        <p className="text-muted-foreground text-sm">
          No audit has been run yet.
        </p>
      ) : query.isLoading ? (
        <WidgetSkeleton />
      ) : query.error ? (
        <WidgetError
          error={query.error}
          onRetry={() => query.refetch()}
          workspaceId={workspaceId}
          projectId={projectId}
        />
      ) : data ? (
        <PageSpeedResults data={data} />
      ) : (
        <EmptyWidget />
      )}
    </ProviderCard>
  )
}

function PageSpeedResults({ data }: { data: PageSpeedDashboardData }) {
  const scores: string[][] = Object.entries(data.scores).map(([key, value]) => [
    key.replace(/([A-Z])/g, ' $1'),
    value === null ? '—' : `${value}`,
  ])
  const metrics: Array<[string, string | null]> = [
    ['LCP', data.metrics.largestContentfulPaint.displayValue],
    ['FCP', data.metrics.firstContentfulPaint.displayValue],
    ['TBT', data.metrics.totalBlockingTime.displayValue],
    ['CLS', data.metrics.cumulativeLayoutShift.displayValue],
    ['Speed Index', data.metrics.speedIndex.displayValue],
  ]
  return (
    <div className="space-y-4">
      <MetricGrid metrics={scores} />
      <MetricGrid
        metrics={metrics.map(
          ([key, value]) => [key, String(value ?? '—')] as string[]
        )}
      />
      <p className="text-muted-foreground text-xs">
        Audited {formatDate(data.fetchedAt)} · {data.url}
      </p>
    </div>
  )
}

function MetricGrid({ metrics }: { metrics: string[][] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {metrics.map(([label, value]) => (
        <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-muted-foreground text-xs capitalize">{label}</p>
          <p className="mt-1 truncate text-xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  )
}

function RankedList({
  title,
  rows,
}: {
  title: string
  rows: [string, number][]
}) {
  return (
    <div className="space-y-2">
      <p className="font-medium">{title}</p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border p-3 text-sm">
          No data available.
        </p>
      ) : (
        <div className="divide-border divide-y rounded-lg border">
          {rows.slice(0, 5).map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between gap-2 px-3 py-2 text-sm"
            >
              <span className="truncate">{label}</span>
              <span className="text-muted-foreground">
                {formatNumber(value)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function WidgetSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-16" />
      ))}
    </div>
  )
}

function EmptyWidget() {
  return <p className="text-muted-foreground text-sm">No data available.</p>
}

function formatMoney(value: number, currency: string) {
  if (!currency) return '—'
  const formatter = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  })
  const digits = formatter.resolvedOptions().maximumFractionDigits ?? 2
  return formatter.format(value / 10 ** digits)
}

function getErrorStatus(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: number } }).response
    return response?.status
  }
  return undefined
}
