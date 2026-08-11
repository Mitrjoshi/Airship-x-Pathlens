import { AppHeader } from '@/components/common/app-header'
import { PageHeader, PageLayout } from '@/components/common/page-layout'
import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Check,
  CreditCard,
  Download,
  Sparkles,
  Globe,
  Database,
} from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Progress } from '@workspace/ui/components/progress'
import { Separator } from '@workspace/ui/components/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { cn } from '@workspace/ui/lib/utils'
import { formatNumber } from '@/utils/utils'
import { navigationIcons } from '@/config/navigation-icons'

export const Route = createFileRoute('/app/plans')({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Plans',
  },
})

const currentPlan = {
  name: 'Pro',
  price: 49,
  billingCycle: 'monthly' as const,
  renewsOn: 'August 26, 2026',
  status: 'Active',
}

const usage = [
  {
    label: 'Page Views',
    used: 842_300,
    limit: 1_000_000,
    icon: Globe,
  },
  {
    label: 'Events',
    used: 128_400,
    limit: 250_000,
    icon: navigationIcons.events,
  },
  {
    label: 'Projects',
    used: 4,
    limit: 10,
    icon: Database,
  },
  {
    label: 'Team Members',
    used: 3,
    limit: 5,
    icon: navigationIcons.members,
  },
]

interface PlanTier {
  name: string
  price: number
  description: string
  features: string[]
  highlighted?: boolean
  current?: boolean
}

const tiers: PlanTier[] = [
  {
    name: 'Starter',
    price: 0,
    description: 'For small side projects getting started.',
    features: [
      '10K page views / month',
      '1 project',
      'Basic analytics',
      '7-day data retention',
      'Community support',
    ],
  },
  {
    name: 'Pro',
    price: 49,
    description: 'For growing products that need deeper insight.',
    features: [
      '1M page views / month',
      '10 projects',
      'Session replay',
      '90-day data retention',
      '5 team members',
      'Priority email support',
    ],
    highlighted: true,
    current: true,
  },
  {
    name: 'Business',
    price: 149,
    description: 'For teams that need scale and control.',
    features: [
      '10M page views / month',
      'Unlimited projects',
      'Session replay',
      '1-year data retention',
      'Unlimited team members',
      'SSO & audit logs',
      'Dedicated support',
    ],
  },
]

const invoices = [
  { id: 'INV-2026-007', date: 'Jul 1, 2026', amount: 49, status: 'Paid' },
  { id: 'INV-2026-006', date: 'Jun 1, 2026', amount: 49, status: 'Paid' },
  { id: 'INV-2026-005', date: 'May 1, 2026', amount: 49, status: 'Paid' },
  { id: 'INV-2026-004', date: 'Apr 1, 2026', amount: 49, status: 'Paid' },
]

function RouteComponent() {
  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly'
  )

  return (
    <PageLayout>
      <AppHeader
        user={{
          name: user?.name ?? 'PathLens user',
          email: user?.email ?? '',
          avatar: user?.avatar,
        }}
        backToWorkspaces
      />

      <PageHeader
        eyebrow="Account"
        title="Plans & billing."
        description="Manage your subscription, usage, and invoices from one place."
        actions={
          <Badge variant="outline" className="w-fit">
            {currentPlan.name} plan · {currentPlan.status}
          </Badge>
        }
      />

      <Card className="py-0">
        <CardHeader className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>Current plan</CardTitle>
              <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/15">
                {currentPlan.status}
              </Badge>
            </div>
            <CardDescription className="mt-2">
              Your subscription is active and renews automatically.
            </CardDescription>
          </div>

          <Button variant="outline" className="self-start">
            <CreditCard />
            Update payment method
          </Button>
        </CardHeader>

        <CardContent className="grid gap-5 p-5 sm:grid-cols-3">
          <div className="bg-muted/40 rounded-xl p-4">
            <p className="text-muted-foreground flex items-center gap-2 text-xs">
              <Sparkles className="size-3.5" />
              Plan
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {currentPlan.name}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Built for growing products
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">Price</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              ${currentPlan.price}
              <span className="text-muted-foreground text-sm font-normal">
                /{currentPlan.billingCycle === 'monthly' ? 'mo' : 'yr'}
              </span>
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              Billed {currentPlan.billingCycle}
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">Next renewal</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight">Aug 26</p>
            <p className="text-muted-foreground mt-1 text-xs">
              {currentPlan.renewsOn}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="py-0">
        <CardHeader className="border-b px-5 py-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Usage this period</CardTitle>
              <CardDescription>
                Current usage against your Pro plan limits.
              </CardDescription>
            </div>
            <Badge variant="outline">Resets Aug 26, 2026</Badge>
          </div>
        </CardHeader>

        <CardContent className="grid gap-3 p-5 md:grid-cols-2">
          {usage.map((item) => {
            const Icon = item.icon
            const percent = Math.round((item.used / item.limit) * 100)

            return (
              <div key={item.label} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {item.label}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatNumber(item.used)} of {formatNumber(item.limit)}
                      </p>
                    </div>
                  </div>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {percent}%
                  </span>
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
      </Card>

      <div className="space-y-5">
        <div className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
              Compare
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              Choose the right plan.
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              Upgrade or downgrade whenever your team changes.
            </p>
          </div>

          <div className="bg-muted/50 flex w-fit items-center gap-1 rounded-xl border p-1">
            <Button
              size="sm"
              variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly
            </Button>
            <Button
              size="sm"
              variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
              onClick={() => setBillingCycle('yearly')}
            >
              Yearly
              <Badge variant="outline" className="ml-1.5">
                -20%
              </Badge>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {tiers.map((tier) => {
            const price =
              billingCycle === 'yearly'
                ? Math.round(tier.price * 12 * 0.8)
                : tier.price

            return (
              <Card
                key={tier.name}
                className={cn(
                  'py-0',
                  tier.highlighted &&
                    'border-foreground/40 ring-foreground/10 ring-1'
                )}
              >
                <CardHeader className="border-b px-5 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle>{tier.name}</CardTitle>
                    {tier.current ? (
                      <Badge>Current</Badge>
                    ) : tier.highlighted ? (
                      <Badge variant="outline">Popular</Badge>
                    ) : null}
                  </div>
                  <CardDescription className="mt-2">
                    {tier.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-5 p-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-semibold tracking-tight">
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    {price > 0 && (
                      <span className="text-muted-foreground text-sm">
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    )}
                  </div>

                  <Separator />

                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="text-primary mt-0.5 size-4 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="border-t px-5 py-4">
                  <Button
                    className="w-full"
                    variant={tier.current ? 'outline' : 'default'}
                    disabled={tier.current}
                  >
                    {tier.current ? 'Current plan' : 'Upgrade'}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>

      <Card className="py-0">
        <CardHeader className="border-b px-5 py-5">
          <CardTitle>Billing history</CardTitle>
          <CardDescription>
            Download past invoices for your records.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[640px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="pl-5 font-mono text-sm">
                      {invoice.id}
                    </TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/15">
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Download ${invoice.id}`}
                      >
                        <Download />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  )
}
