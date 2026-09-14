import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  CheckCircle2Icon,
  CreditCardIcon,
  ExternalLinkIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from 'lucide-react'

import { PageHeader, PageLayout } from '@/components/common/page-layout'
import { useLifetimeCheckout } from '@/mutations/billing'
import { getBillingEntitlementOptions } from '@/queries/billing'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

export const Route = createFileRoute('/app/billing')({
  component: RouteComponent,
  staticData: { breadcrumb: 'Billing' },
})

function maskReference(value: string | null) {
  if (!value) return null
  if (value.length <= 12) return value

  return `${value.slice(0, 8)}...${value.slice(-4)}`
}

function RouteComponent() {
  const { data, isPending, isError } = useQuery(getBillingEntitlementOptions())
  const lifetimeCheckout = useLifetimeCheckout()
  const entitlement = data?.data

  return (
    <PageLayout>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Account"
          title="Billing."
          description="Manage your account access and understand how it applies to your workspaces."
        />

        {isError ? (
          <div
            role="alert"
            className="text-destructive rounded-xl border border-dashed px-5 py-4 text-sm"
          >
            Unable to load billing details. Refresh the page and try again.
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)]">
          <Card className="relative overflow-hidden rounded-2xl shadow-none">
            <div className="bg-foreground absolute inset-x-0 top-0 h-1" />
            <CardHeader className="px-5 pt-7 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <SparklesIcon className="size-5" />
                  </span>
                  <div>
                    <CardTitle>Lifetime account access</CardTitle>
                    <CardDescription className="mt-1">
                      One-time access for creating and managing additional
                      workspaces.
                    </CardDescription>
                  </div>
                </div>
                {isPending ? null : (
                  <Badge
                    variant={
                      entitlement?.lifetime_access ? 'default' : 'outline'
                    }
                  >
                    {entitlement?.lifetime_access ? 'Active' : 'Not active'}
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-5 pb-6 sm:px-6">
              {isPending ? (
                <div className="bg-muted/40 h-20 animate-pulse rounded-xl" />
              ) : entitlement?.lifetime_access ? (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                      <p className="text-sm font-medium">
                        Lifetime access is active on your account.
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        Every workspace keeps its own usage limits and usage
                        status.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/40 rounded-xl border p-4">
                  <p className="text-sm font-medium">
                    Unlock additional workspaces
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    Make a one-time payment to create more workspaces on this
                    account. Workspace usage limits still apply independently.
                  </p>
                  <Button
                    className="mt-4"
                    disabled={lifetimeCheckout.isPending}
                    onClick={() => lifetimeCheckout.mutate()}
                  >
                    <CreditCardIcon />
                    {lifetimeCheckout.isPending
                      ? 'Opening checkout...'
                      : 'Get lifetime access'}
                  </Button>
                </div>
              )}

              <div className="grid gap-4 border-t pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground flex items-center gap-2 text-xs">
                    <ShieldCheckIcon className="size-3.5" />
                    Usage model
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    Limits apply per workspace
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-2 text-xs">
                    <SparklesIcon className="size-3.5" />
                    Access scope
                  </p>
                  <p className="mt-2 text-sm font-medium">Account-wide</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30 rounded-2xl shadow-none">
            <CardHeader className="px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <span className="bg-background text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl border">
                  <CreditCardIcon className="size-4" />
                </span>
                <div>
                  <CardTitle>Payment record</CardTitle>
                  <CardDescription className="mt-1">
                    Payment details confirmed by Stripe.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="bg-background rounded-xl border p-4">
                <p className="text-muted-foreground text-xs">Payment ID</p>
                <p className="mt-2 font-mono text-xs break-all">
                  {isPending
                    ? 'Loading...'
                    : (maskReference(entitlement?.stripe_payment_id ?? null) ??
                      'No payment recorded')}
                </p>
              </div>
              <p className="text-muted-foreground text-xs leading-5">
                Payment methods and invoices are managed securely by Stripe.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl shadow-none">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div>
              <p className="text-sm font-medium">
                Need workspace usage details?
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Review limits and usage for each workspace separately.
              </p>
            </div>
            <Button variant="outline" render={<Link to="/app" />}>
              View workspaces
              <ExternalLinkIcon />
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  )
}
