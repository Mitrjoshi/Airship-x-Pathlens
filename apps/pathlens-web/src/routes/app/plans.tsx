import { AppLayout } from '@/components/common/app-layout'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Check,
  CreditCard,
  Download,
  Sparkles,
  Users,
  Globe,
  MousePointerClick,
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
    icon: MousePointerClick,
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
    icon: Users,
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly'
  )

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plans & Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription, usage, and invoices.
          </p>
        </div>

        {/* Current Plan */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle>Current Plan</CardTitle>
                <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/15">
                  {currentPlan.status}
                </Badge>
              </div>
              <CardDescription>
                Renews on {currentPlan.renewsOn}
              </CardDescription>
            </div>

            <Button variant="outline">
              <CreditCard className="mr-2 h-4 w-4" />
              Update Payment Method
            </Button>
          </CardHeader>

          <CardContent>
            <div className="flex items-baseline gap-2">
              <Sparkles className="text-muted-foreground h-5 w-5" />
              <span className="text-2xl font-bold">{currentPlan.name}</span>
              <span className="text-muted-foreground">
                ${currentPlan.price}/
                {currentPlan.billingCycle === 'monthly' ? 'mo' : 'yr'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>
              Current billing period usage against your plan limits.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-6 md:grid-cols-2">
            {usage.map((item) => {
              const Icon = item.icon
              const percent = Math.round((item.used / item.limit) * 100)

              return (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Icon className="text-muted-foreground h-4 w-4" />
                      <span className="font-medium">{item.label}</span>
                    </div>

                    <span className="text-muted-foreground">
                      {formatNumber(item.used)} / {formatNumber(item.limit)}
                    </span>
                  </div>

                  <Progress
                    value={percent}
                    className={cn(percent >= 90 && '[&>div]:bg-destructive')}
                  />
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Pricing Tiers */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Available Plans</h2>
              <p className="text-muted-foreground text-sm">
                Upgrade or downgrade at any time.
              </p>
            </div>

            <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
              <Button
                variant={billingCycle === 'monthly' ? 'default' : 'ghost'}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </Button>
              <Button
                variant={billingCycle === 'yearly' ? 'default' : 'ghost'}
                onClick={() => setBillingCycle('yearly')}
              >
                Yearly
                <Badge variant="outline" className="ml-2">
                  -20%
                </Badge>
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {tiers.map((tier) => {
              const price =
                billingCycle === 'yearly'
                  ? Math.round(tier.price * 12 * 0.8)
                  : tier.price

              return (
                <Card
                  key={tier.name}
                  className={cn(tier.highlighted && 'border-primary shadow-md')}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>{tier.name}</CardTitle>
                      {tier.current && <Badge>Current Plan</Badge>}
                    </div>
                    <CardDescription>{tier.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        {price === 0 ? 'Free' : `$${price}`}
                      </span>
                      {price > 0 && (
                        <span className="text-muted-foreground text-sm">
                          /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      )}
                    </div>

                    <Separator />

                    <ul className="space-y-2.5">
                      {tier.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Check className="text-primary mt-0.5 h-4 w-4 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full"
                      variant={tier.current ? 'outline' : 'default'}
                      disabled={tier.current}
                    >
                      {tier.current ? 'Current Plan' : 'Upgrade'}
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>
              Download past invoices for your records.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">
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
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
