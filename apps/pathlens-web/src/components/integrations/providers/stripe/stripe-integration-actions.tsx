import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'

import { useConnectStripe } from '@/mutations/integrations'
import { getStripeOverviewOptions } from '@/queries/integrations'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@workspace/ui/components/sheet'

import type { IntegrationProviderProps } from '../../registry'
import type { Integration } from '@workspace/contracts'
import type { ReactNode } from 'react'

type Props = IntegrationProviderProps & {
  integration: Integration
}

type Money = Record<string, number>

interface StripeOverview {
  account: {
    id: string
  }
  period: {
    start: string
    end: string
    days: number
  }
  revenue: {
    gross: Money
    refunds: Money
    net_after_refunds: Money
    unit: 'minor'
    fees_included: boolean
  }
  payments: {
    successful_charges: number
    failed_payment_intents: number
    total_payment_intents: number
  }
  subscriptions: {
    active: number
    trialing: number
    canceled: number
    total: number
    snapshot: boolean
  }
  revenue_by_day: {
    date: string
    gross: Money
    refunds: Money
  }[]
}

const periodOptions = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'Last 365 days', value: '365' },
]

const zeroDecimalCurrencies = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
])

const formatMoney = (amount: number, currency: string) => {
  const divisor = zeroDecimalCurrencies.has(currency.toLowerCase()) ? 1 : 100

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: divisor === 1 ? 0 : 2,
    }).format(amount / divisor)
  } catch {
    return `${currency.toUpperCase()} ${(amount / divisor).toLocaleString('en-IN')}`
  }
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-IN').format(value)

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date))

const getCurrencies = (overview: StripeOverview) => {
  const currencies = new Set<string>()

  const sources = [
    overview.revenue.gross,
    overview.revenue.refunds,
    overview.revenue.net_after_refunds,
    ...overview.revenue_by_day.flatMap((day) => [day.gross, day.refunds]),
  ]

  sources.forEach((source) => {
    Object.keys(source).forEach((currency) => {
      currencies.add(currency.toLowerCase())
    })
  })

  return Array.from(currencies).sort()
}

function MetricCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="bg-muted/40 space-y-2 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>

      <p className="text-lg font-semibold tracking-tight tabular-nums">
        {value}
      </p>
    </div>
  )
}

function AnalyticsSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <p className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
        {title}
      </p>

      <div className="space-y-3">{children}</div>
    </section>
  )
}

function AnalyticsRow({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>

      <div className="min-w-0 text-right font-medium break-all">
        {value ?? '—'}
      </div>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-20 rounded-lg" />
        ))}
      </div>

      <Separator />

      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />

          {index !== 2 && <Separator className="mt-6" />}
        </div>
      ))}
    </div>
  )
}

export const StripeIntegrationActions = ({
  workspaceId,
  projectId,
  returnPath,
  integration,
}: Props) => {
  const [open, setOpen] = useState(false)
  const [days, setDays] = useState(365)
  const [selectedCurrency, setSelectedCurrency] = useState('')

  const { mutate: connect, isPending: connecting } = useConnectStripe(
    workspaceId,
    projectId
  )

  const {
    data: overviewData,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
    error: overviewError,
    refetch,
  } = useQuery({
    ...getStripeOverviewOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      days,
    }),
    enabled: Boolean(integration.isConnected) && open,
  })

  const overview = overviewData?.data as StripeOverview | undefined

  const currencies = overview ? getCurrencies(overview) : []

  const currency = currencies.includes(selectedCurrency)
    ? selectedCurrency
    : (currencies[0] ?? '')

  const hasCurrency = currency.length > 0

  const grossRevenue = overview?.revenue.gross[currency] ?? 0
  const refundedAmount = overview?.revenue.refunds[currency] ?? 0
  const netRevenue = overview?.revenue.net_after_refunds[currency] ?? 0

  const payments = overview?.payments
  const subscriptions = overview?.subscriptions

  // This is an indicative ratio, not Stripe's official
  // historical payment success rate.
  const successRatio =
    payments && payments.total_payment_intents > 0
      ? (
          (payments.successful_charges / payments.total_payment_intents) *
          100
        ).toFixed(1)
      : '0.0'

  return (
    <>
      <Button
        variant={integration.isConnected ? 'destructive' : 'default'}
        onClick={() => connect(returnPath)}
      >
        <LoadingSwap isLoading={connecting}>
          {integration.isConnected ? 'Disconnect' : 'Connect'}
        </LoadingSwap>
      </Button>

      {integration.isConnected && (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={<Button variant="outline">View Analytics</Button>}
          />

          <SheetContent className="flex w-full max-w-lg! flex-col gap-0 p-0">
            <SheetHeader className="border-b px-6 py-5">
              <div className="space-y-2">
                <div>
                  <SheetTitle className="text-lg">Stripe Analytics</SheetTitle>

                  <SheetDescription>
                    Payment, revenue, and subscription performance
                  </SheetDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Connected</Badge>

                  {overview && (
                    <>
                      {hasCurrency && (
                        <span className="text-muted-foreground text-xs">
                          {currency.toUpperCase()}
                        </span>
                      )}

                      <span className="text-muted-foreground text-xs">
                        Last {days} days
                      </span>
                    </>
                  )}
                </div>
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {overviewLoading && !overview ? (
                <AnalyticsSkeleton />
              ) : overviewError && !overview ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-sm font-medium">
                    Unable to load analytics
                  </p>

                  <p className="text-muted-foreground text-xs">
                    {overviewError.message}
                  </p>

                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Try again
                  </Button>
                </div>
              ) : overview ? (
                <div className="space-y-6 p-6">
                  {/* Filters */}

                  <div className="flex items-center justify-between gap-2">
                    <Select
                      items={periodOptions}
                      value={String(days)}
                      onValueChange={(value) => {
                        if (value) setDays(Number(value))
                      }}
                    >
                      <SelectTrigger className="w-40" size="sm">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        {periodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                      {currencies.length > 1 && (
                        <Select
                          items={currencies.map((item) => ({
                            label: item.toUpperCase(),
                            value: item,
                          }))}
                          value={currency}
                          onValueChange={(value) => {
                            if (value) setSelectedCurrency(value)
                          }}
                        >
                          <SelectTrigger className="w-24" size="sm">
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

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={overviewFetching}
                        onClick={() => refetch()}
                      >
                        <RefreshCw
                          className={`size-3.5 ${
                            overviewFetching ? 'animate-spin' : ''
                          }`}
                        />
                        Refresh
                      </Button>
                    </div>
                  </div>

                  {overviewError && (
                    <p className="text-destructive text-xs">
                      Refresh failed. Showing previously loaded data.
                    </p>
                  )}

                  {/* Revenue */}

                  <AnalyticsSection title="Revenue">
                    <div className="grid grid-cols-2 gap-2">
                      <MetricCard
                        label="Gross revenue"
                        value={
                          hasCurrency
                            ? formatMoney(grossRevenue, currency)
                            : '—'
                        }
                      />

                      <MetricCard
                        label="Net revenue"
                        value={
                          hasCurrency ? formatMoney(netRevenue, currency) : '—'
                        }
                      />

                      <MetricCard
                        label="Refunds"
                        value={
                          hasCurrency
                            ? formatMoney(refundedAmount, currency)
                            : '—'
                        }
                      />

                      <MetricCard
                        label="Successful payments"
                        value={formatNumber(payments?.successful_charges ?? 0)}
                      />
                    </div>

                    <p className="text-muted-foreground text-xs">
                      Net revenue excludes refunded amounts but does not deduct
                      Stripe processing fees.
                    </p>

                    {!hasCurrency && (
                      <p className="text-muted-foreground text-xs">
                        No revenue recorded for this period.
                      </p>
                    )}
                  </AnalyticsSection>

                  <Separator />

                  {/* Payments */}

                  <AnalyticsSection title="Payments">
                    <AnalyticsRow
                      label="Payment intents"
                      value={formatNumber(payments?.total_payment_intents ?? 0)}
                    />

                    <AnalyticsRow
                      label="Successful charges"
                      value={formatNumber(payments?.successful_charges ?? 0)}
                    />

                    <AnalyticsRow
                      label="Failed payment intents"
                      value={formatNumber(
                        payments?.failed_payment_intents ?? 0
                      )}
                    />

                    <AnalyticsRow
                      label="Success ratio"
                      value={`${successRatio}%`}
                    />

                    <p className="text-muted-foreground text-xs">
                      Success ratio is indicative and does not represent a
                      historical payment success rate.
                    </p>
                  </AnalyticsSection>

                  <Separator />

                  {/* Subscriptions */}

                  <AnalyticsSection title="Subscriptions">
                    <div className="grid grid-cols-3 gap-2">
                      <MetricCard
                        label="Active"
                        value={formatNumber(subscriptions?.active ?? 0)}
                      />

                      <MetricCard
                        label="Trialing"
                        value={formatNumber(subscriptions?.trialing ?? 0)}
                      />

                      <MetricCard
                        label="Canceled"
                        value={formatNumber(subscriptions?.canceled ?? 0)}
                      />
                    </div>

                    <AnalyticsRow
                      label="Total subscriptions"
                      value={formatNumber(subscriptions?.total ?? 0)}
                    />

                    <AnalyticsRow
                      label="Data type"
                      value={
                        <Badge variant="outline">
                          {subscriptions?.snapshot
                            ? 'Current snapshot'
                            : 'Historical'}
                        </Badge>
                      }
                    />
                  </AnalyticsSection>

                  <Separator />

                  {/* Account */}

                  <AnalyticsSection title="Account">
                    <AnalyticsRow label="Provider" value="Stripe" />

                    <AnalyticsRow
                      label="Account ID"
                      value={
                        <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                          {overview.account.id}
                        </code>
                      }
                    />

                    <AnalyticsRow
                      label="Status"
                      value={<Badge variant="secondary">Connected</Badge>}
                    />
                  </AnalyticsSection>

                  <Separator />

                  {/* Reporting Period */}

                  <AnalyticsSection title="Reporting period">
                    <AnalyticsRow
                      label="From"
                      value={formatDate(overview.period.start)}
                    />

                    <AnalyticsRow
                      label="To"
                      value={formatDate(overview.period.end)}
                    />

                    <AnalyticsRow
                      label="Duration"
                      value={`${overview.period.days} days`}
                    />
                  </AnalyticsSection>

                  {currencies.length > 1 && (
                    <p className="text-muted-foreground text-xs">
                      Revenue is shown separately by currency. Currency
                      conversion is not applied.
                    </p>
                  )}

                  <div className="border-t pt-4">
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      Your financial data stays with Stripe. Pathlens securely
                      retrieves analytics directly from your connected Stripe
                      account and does not permanently store payment or
                      transaction records in our database. Your account
                      connection details are stored securely to maintain the
                      integration.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground flex min-h-64 items-center justify-center p-6 text-sm">
                  No Stripe analytics available.
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
