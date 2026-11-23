import { useLifetimeCheckout } from '@/mutations/billing'
import { getBillingEntitlementOptions } from '@/queries/billing'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { CheckCircle2Icon, CheckIcon, DownloadIcon } from 'lucide-react'
import { FaqQuestions } from '@/routes/(open)/-components/faq'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { formatDate } from '@/utils/utils'

export const Route = createFileRoute('/app/(entry)/billing')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data, isLoading } = useQuery(getBillingEntitlementOptions())

  const access = data?.data

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl pt-10">
        <div className="bg-muted h-32 animate-pulse rounded-xl" />
      </div>
    )
  }

  if (!access) return null

  return (
    <div>
      <div className="mx-auto w-full max-w-4xl p-6 pt-10">
        <div className="space-y-6">
          <div>
            <p className="text-xl font-medium">Billing</p>
            <p className="text-muted-foreground text-sm">
              Manage your PathLens plan and billing access.
            </p>
          </div>

          {!access.lifetime_access ? (
            <div className="space-y-10">
              <div className="mx-auto grid grid-cols-2 divide-x-2 divide-dashed border-2 border-dashed">
                <PricingCard
                  current={!access.lifetime_access}
                  plan="FREE"
                  price={0}
                  description="Build and learn free with no time limits and no credit card required."
                  limits={[
                    {
                      label: 'Events',
                      value: '100K',
                    },
                    {
                      label: 'Page Views',
                      value: '10K',
                    },
                    {
                      label: 'Session Recordings',
                      value: '100',
                    },
                    {
                      label: 'Funnels',
                      value: '3',
                    },
                    {
                      label: 'Goals',
                      value: '3',
                    },
                    {
                      label: 'Heatmaps',
                      value: '5',
                    },
                    {
                      label: 'Workspaces',
                      value: '1',
                    },
                    {
                      label: 'Projects',
                      value: '5',
                    },
                    {
                      label: 'Team Members',
                      value: '0',
                    },
                    {
                      label: '',
                      value:
                        'User privacy comes first. All user inputs are masked by default, helping you understand user behavior without exposing sensitive information.',
                    },
                  ]}
                />

                <PricingCard
                  current={access.lifetime_access}
                  best
                  plan="UNLIMITED"
                  price={499}
                  description="More users, more recordings, and advanced analytics to understand and improve user behavior."
                  limits={[
                    {
                      label: 'Events',
                      value: 'Unlimited',
                    },
                    {
                      label: 'Page Views',
                      value: 'Unlimited',
                    },
                    {
                      label: 'Session Recordings',
                      value: 'Unlimited',
                    },
                    {
                      label: 'Funnels',
                      value: 'Unlimited',
                    },
                    {
                      label: 'Goals',
                      value: 'Unlimited',
                    },
                    {
                      label: 'Heatmaps',
                      value: 'Unlimited',
                    },
                    {
                      label: 'Workspaces',
                      value: 'Unlimited',
                    },
                    {
                      label: 'Projects',
                      value: 'Unlimited',
                    },
                    {
                      label: 'Team Members',
                      value: 'Unlimited',
                    },
                    {
                      label: '',
                      value:
                        'User privacy comes first. All user inputs are masked by default, helping you understand user behavior without exposing sensitive information.',
                    },
                  ]}
                />
              </div>

              <div className="mt-10 space-y-4">
                <p className="text-2xl font-medium">
                  Frequently Asked Questions
                </p>
                <FaqQuestions />
              </div>
            </div>
          ) : (
            <div className="border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Purchased At</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="w-32 text-center">Invoice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Paid</TableCell>
                    <TableCell>{access.stripe_payment_id}</TableCell>
                    <TableCell>₹499</TableCell>
                    <TableCell>
                      {access?.purchased_at
                        ? formatDate(access?.purchased_at)
                        : '-'}
                    </TableCell>
                    <TableCell>MasterCard</TableCell>
                    <TableCell className="w-20 text-center">
                      <Button variant={'outline'}>
                        <DownloadIcon />
                        Invoice
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const PricingCard = ({
  plan,
  price,
  description,
  best,
  limits,
  current,
}: {
  plan: string
  price: number
  description: string
  best?: boolean
  current: boolean
  limits: {
    label: string
    value: string
  }[]
}) => {
  const { mutate, isPending } = useLifetimeCheckout()

  return (
    <div className="space-y-5 p-5">
      <p
        className={`${best ? 'text-primary' : 'text-muted-foreground'} text-sm`}
      >
        {plan}
      </p>

      <p className="text-3xl font-medium">₹{price}</p>

      <p className="text-muted-foreground">{description}</p>

      <Button
        onClick={() => {
          mutate()
        }}
        disabled={current}
        variant={!best ? 'outline' : 'default'}
        className="w-full"
      >
        <LoadingSwap isLoading={isPending}>
          {current ? 'Current Plan' : 'Buy Plan'}
        </LoadingSwap>
      </Button>

      <div className="border-t py-5">
        <p className="mb-3 text-sm font-medium">Limits</p>

        <ul className="space-y-4">
          {limits.map((limit) => (
            <li
              key={limit.label}
              className="text-muted-foreground flex items-start gap-4"
            >
              <span
                className={`${best ? 'bg-primary' : 'bg-muted-foreground'} mt-1 h-2 w-2 shrink-0`}
              />

              <p className="text-foreground">
                {limit.value} <span>{limit.label}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
