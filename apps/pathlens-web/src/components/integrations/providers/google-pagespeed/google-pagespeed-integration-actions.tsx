import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import type {
  Integration,
  PageSpeedResult,
  PageSpeedStrategy,
} from '@workspace/contracts'
import {
  useCheckGooglePageSpeed,
  useInstallGooglePageSpeed,
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
import { Separator } from '@workspace/ui/components/separator'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import type { IntegrationProviderProps } from '../../registry'

type Props = IntegrationProviderProps & { integration: Integration }

const scoreLabels = [
  ['performance', 'Performance'],
  ['accessibility', 'Accessibility'],
  ['bestPractices', 'Best Practices'],
  ['seo', 'SEO'],
] as const

export function GooglePageSpeedIntegrationActions({
  workspaceId,
  projectId,
  integration,
}: Props) {
  const [open, setOpen] = useState(false)
  const [domainId, setDomainId] = useState('')
  const [strategy, setStrategy] = useState<PageSpeedStrategy>('mobile')
  const [result, setResult] = useState<PageSpeedResult | null>(null)
  const { data: domainsData, isLoading: domainsLoading } = useQuery({
    ...getProjectDomainsOptions(projectId),
    enabled: open,
  })
  const { mutate: install, isPending: installing } = useInstallGooglePageSpeed(
    workspaceId,
    projectId
  )
  const {
    mutate: check,
    isPending: checking,
    reset,
  } = useCheckGooglePageSpeed(workspaceId, projectId)

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
      { domainId, strategy },
      { onSuccess: (data) => setResult(data.data ?? null) }
    )
  }

  const strategyDevice = [
    {
      value: 'mobile',
      label: 'Mobile',
    },
    {
      value: 'desktop',
      label: 'Desktop',
    },
  ]

  return (
    <>
      {!integration.isConnected ? (
        <Button disabled={installing} onClick={() => install()}>
          <LoadingSwap isLoading={installing}>Install</LoadingSwap>
        </Button>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button onClick={openDialog}>Check Performance</Button>
          </DialogTrigger>
          <DialogContent
            showCloseButton={false}
            className={result ? 'max-w-2xl!' : ''}
          >
            <DialogHeader>
              <DialogTitle>Check PageSpeed Insights</DialogTitle>
              <DialogDescription>
                Select a project domain to run a Google PageSpeed Insights
                audit.
              </DialogDescription>
            </DialogHeader>

            {result ? (
              <PageSpeedResults result={result} />
            ) : (
              <FieldGroup className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="pagespeed-domain">Domain</FieldLabel>
                  <Select
                    items={domains}
                    value={domainId}
                    onValueChange={(value) => setDomainId(value as string)}
                    disabled={domainsLoading || checking}
                  >
                    <SelectTrigger id="pagespeed-domain" className="w-full">
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
                  <FieldLabel htmlFor="pagespeed-strategy">Strategy</FieldLabel>
                  <Select
                    items={strategyDevice}
                    value={strategy}
                    onValueChange={(value) =>
                      setStrategy(value as PageSpeedStrategy)
                    }
                    disabled={checking}
                  >
                    <SelectTrigger id="pagespeed-strategy" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent alignItemWithTrigger={false}>
                      {strategyDevice?.map((domain) => (
                        <SelectItem key={domain.value} value={domain.value}>
                          {domain.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            )}

            <DialogFooter className="bg-transparent">
              <DialogClose
                render={<Button variant={'outline'}>Cancel</Button>}
              />
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

function PageSpeedResults({ result }: { result: PageSpeedResult }) {
  return (
    <div className="space-y-5">
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span className="truncate">{result.url}</span>
        <span className="capitalize">{result.strategy}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {scoreLabels.map(([key, label]) => {
          const score = result.scores[key]
          const color = getScoreColor(score)

          return (
            <div
              key={key}
              className="rounded-lg border p-3 text-center transition-colors duration-500"
              style={
                color
                  ? {
                      borderColor: `${color} / 0.35`,
                      background: `linear-gradient(135deg, ${color} / 0.16, transparent 75%)`,
                    }
                  : undefined
              }
            >
              <p className="text-muted-foreground text-xs">{label}</p>
              <p
                className="text-2xl font-semibold transition-colors duration-500"
                style={color ? { color } : undefined}
              >
                {score ? `${score}%` : '-'}
              </p>
            </div>
          )
        })}
      </div>
      <Separator />
      <div className="grid gap-3 sm:grid-cols-2">
        {result.metrics.map((metric) => (
          <div
            key={metric.id}
            className="flex items-center justify-between gap-4"
          >
            <span className="text-muted-foreground text-sm">
              {metric.label}
            </span>
            <span className="font-medium">{metric.displayValue ?? '-'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function getScoreColor(score: number | null) {
  if (score === null) return null

  const hue = Math.max(0, Math.min(100, score)) * 1.2
  return `hsl(${hue} 75% 45%)`
}
