import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { Integration, SearchConsoleResult } from '@workspace/contracts'
import {
  useCheckGoogleSearchConsole,
  useConnectGoogleSearchConsole,
} from '@/mutations/integrations'
import { getProjectDomainsOptions } from '@/queries/domains'
import { Button } from '@workspace/ui/components/button'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import type { IntegrationProviderProps } from '../../registry'

type Props = IntegrationProviderProps & { integration: Integration }
type Days = 7 | 28 | 90

const ranges = [
  { value: '7', label: 'Last 7 days' },
  { value: '28', label: 'Last 28 days' },
  { value: '90', label: 'Last 90 days' },
]

export function GoogleSearchConsoleIntegrationActions({
  workspaceId,
  projectId,
  returnPath,
  integration,
}: Props) {
  const [open, setOpen] = useState(false)
  const [domainId, setDomainId] = useState('')
  const [days, setDays] = useState<Days>(28)
  const [result, setResult] = useState<SearchConsoleResult | null>(null)
  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    ...getProjectDomainsOptions(projectId),
    enabled: open,
  })
  const { mutate: connect, isPending: connecting } =
    useConnectGoogleSearchConsole(workspaceId, projectId)
  const {
    mutate: check,
    isPending: checking,
    reset,
  } = useCheckGoogleSearchConsole(workspaceId, projectId)

  const domains = domainsData?.data.map((item) => ({
    value: item.id,
    label: `${item.domain}${item.isDefault ? ' (Default)' : ''}`,
  }))

  function openDialog() {
    setResult(null)
    reset()
    setOpen(true)
  }

  function checkDomain() {
    if (!domainId) return
    check(
      { domainId, days },
      { onSuccess: (data) => setResult(data.data ?? null) }
    )
  }

  return (
    <>
      {!integration.isConnected ? (
        <Button disabled={connecting} onClick={() => connect(returnPath)}>
          <LoadingSwap isLoading={connecting}>
            Connect Search Console
          </LoadingSwap>
        </Button>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button onClick={openDialog}>Check Search Console</Button>
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            className={result ? 'max-w-3xl!' : ''}
          >
            <DialogHeader>
              <DialogTitle>Google Search Console</DialogTitle>
              <DialogDescription>
                Review search performance for one of this project&apos;s
                domains.
              </DialogDescription>
            </DialogHeader>

            {result ? (
              <SearchConsoleResults result={result} />
            ) : (
              <FieldGroup className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="search-console-domain">
                    Domain
                  </FieldLabel>
                  <Select
                    items={domains}
                    value={domainId}
                    onValueChange={(value) => setDomainId(value as string)}
                    disabled={domainsLoading || checking}
                  >
                    <SelectTrigger
                      id="search-console-domain"
                      className="w-full"
                    >
                      <SelectValue
                        placeholder={
                          domainsLoading
                            ? 'Loading domains...'
                            : 'Select a domain'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {domains?.map((domain) => (
                        <SelectItem key={domain.value} value={domain.value}>
                          {domain.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="search-console-range">
                    Reporting period
                  </FieldLabel>
                  <Select
                    items={ranges}
                    value={String(days)}
                    onValueChange={(value) => setDays(Number(value) as Days)}
                    disabled={checking}
                  >
                    <SelectTrigger id="search-console-range" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {ranges.map((range) => (
                        <SelectItem key={range.value} value={range.value}>
                          {range.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            )}

            <DialogFooter className="bg-transparent">
              <DialogClose render={<Button variant="outline">Close</Button>} />
              {result ? (
                <Button onClick={() => setResult(null)}>
                  Check Another Domain
                </Button>
              ) : (
                <Button disabled={!domainId || checking} onClick={checkDomain}>
                  <LoadingSwap isLoading={checking}>
                    Check Performance
                  </LoadingSwap>
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

function SearchConsoleResults({ result }: { result: SearchConsoleResult }) {
  return (
    <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
      <div className="text-muted-foreground flex items-center justify-between gap-4 text-sm">
        <span className="truncate">{result.siteUrl}</span>
        <span className="shrink-0">
          {result.startDate} to {result.endDate}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Clicks"
          value={formatNumber(result.summary.clicks)}
        />
        <SummaryCard
          label="Impressions"
          value={formatNumber(result.summary.impressions)}
        />
        <SummaryCard label="CTR" value={formatPercent(result.summary.ctr)} />
        <SummaryCard
          label="Avg. Position"
          value={result.summary.position.toFixed(1)}
        />
      </div>
      <SearchConsoleTable title="Top queries" rows={result.topQueries} />
      <SearchConsoleTable title="Top pages" rows={result.topPages} />
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 text-center">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-xl font-semibold">{value}</p>
    </div>
  )
}

function SearchConsoleTable({
  title,
  rows,
}: {
  title: string
  rows: SearchConsoleResult['topQueries']
}) {
  return (
    <div className="space-y-2">
      <p className="font-medium">{title}</p>
      <div className="divide-border divide-y rounded-lg border">
        {rows.length === 0 ? (
          <p className="text-muted-foreground p-3 text-sm">
            No data available.
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 p-3 text-sm"
            >
              <span className="truncate" title={row.key}>
                {row.key}
              </span>
              <span className="text-muted-foreground">
                {formatNumber(row.clicks)} clicks
              </span>
              <span className="text-muted-foreground">
                {formatPercent(row.ctr)} CTR
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}
