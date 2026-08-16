import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Database,
  Gauge,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react'

import { MarketingShell } from '@/components/marketing/marketing-shell'
import { PLAN_TIERS } from '@/lib/billing'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { cn } from '@workspace/ui/lib/utils'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
  staticData: {
    breadcrumb: 'Pricing',
  },
})

const comparisonRows = [
  {
    label: 'Page views / month',
    values: PLAN_TIERS.map((plan) => plan.limits.pageViews.toLocaleString()),
  },
  {
    label: 'Events / month',
    values: PLAN_TIERS.map((plan) => plan.limits.events.toLocaleString()),
  },
  {
    label: 'Projects',
    values: PLAN_TIERS.map((plan) =>
      plan.limits.projects === null ? 'Unlimited' : String(plan.limits.projects)
    ),
  },
  {
    label: 'Team members',
    values: PLAN_TIERS.map((plan) =>
      plan.limits.members === null ? 'Unlimited' : String(plan.limits.members)
    ),
  },
  {
    label: 'Session recordings / month',
    values: PLAN_TIERS.map((plan) =>
      plan.limits.sessionRecordings.toLocaleString()
    ),
  },
  {
    label: 'Data retention',
    values: PLAN_TIERS.map((plan) => `${plan.limits.retentionDays} days`),
  },
] as const

const pricingFaqs = [
  {
    question: 'Can I start without a credit card?',
    answer:
      'Yes. Starter is free forever and includes the essentials you need to connect a first project and understand its traffic.',
  },
  {
    question: 'Can I change plans later?',
    answer:
      'Yes. Upgrade or downgrade when your workspace changes. Your plan and usage are easy to review from the billing screen.',
  },
  {
    question: 'What happens when I reach a limit?',
    answer:
      'You will see usage clearly in the workspace. Upgrade when you need more room, or keep your current plan while you decide.',
  },
  {
    question: 'Is session replay privacy-conscious?',
    answer:
      'PathLens supports masking inputs and text, blocking sensitive elements, and excluding password values from ordinary input activity.',
  },
]

function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    'monthly'
  )

  return (
    <MarketingShell active="pricing">
      <section className="relative isolate overflow-hidden border-b px-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-48 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute top-32 left-[-12rem] size-[32rem] rounded-full bg-cyan-400/10 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl py-20 text-center sm:py-28">
          <Badge variant="outline" className="mb-6">
            <Sparkles /> Simple pricing, useful limits
          </Badge>
          <h1 className="text-5xl leading-[0.95] font-semibold tracking-[-0.075em] sm:text-7xl">
            Choose the room your team needs.
          </h1>
          <p className="text-muted-foreground mx-auto mt-7 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8">
            Start with the essentials, then add more depth as your product and
            your questions grow. Every plan keeps the signal connected.
          </p>
          <div className="text-muted-foreground mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-500" /> No credit card
              required
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-500" /> Change anytime
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-500" /> Privacy-first by
              default
            </span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-8 flex flex-col gap-5 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Plans that scale with your questions
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Start small. See more when you are ready.
            </h2>
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
                Save 20%
              </Badge>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {PLAN_TIERS.map((tier) => {
            const price =
              billingCycle === 'yearly'
                ? Math.round(tier.price * 12 * 0.8)
                : tier.price

            return (
              <article
                key={tier.id}
                className={cn(
                  'bg-card flex flex-col overflow-hidden rounded-2xl border shadow-sm',
                  tier.highlighted &&
                    'border-foreground/40 ring-foreground/10 ring-1'
                )}
              >
                {tier.highlighted && (
                  <div className="bg-foreground text-background px-5 py-1.5 text-center text-[11px] font-medium tracking-[0.16em] uppercase">
                    Most popular
                  </div>
                )}
                <div className="border-b p-6 sm:p-7">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {tier.name}
                    </h3>
                    {tier.highlighted && (
                      <Badge variant="outline">For growing teams</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-3 min-h-10 text-sm leading-5">
                    {tier.description}
                  </p>
                  <div className="mt-7 flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tracking-[-0.05em]">
                      {price === 0 ? 'Free' : `$${price}`}
                    </span>
                    <span className="text-muted-foreground text-sm">
                      {price === 0
                        ? 'forever'
                        : billingCycle === 'monthly'
                          ? '/mo'
                          : '/yr'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && tier.price > 0 && (
                    <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                      Equivalent to ${Math.round(tier.price * 0.8)}/mo, billed
                      yearly
                    </p>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-6 sm:p-7">
                  <ul className="space-y-3 text-sm">
                    {tier.features.slice(0, 9).map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="text-foreground mt-0.5 size-4 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground mt-4 text-xs">
                    + {Math.max(tier.features.length - 9, 0)} more capabilities
                    included
                  </p>
                  <Button
                    className="mt-7 w-full"
                    size="lg"
                    render={<Link to="/sign-up" />}
                  >
                    {tier.price === 0
                      ? 'Start free'
                      : `Start with ${tier.name}`}
                    <ArrowUpRight />
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="bg-muted/20 border-y px-5 sm:px-8">
        <div className="mx-auto max-w-7xl py-16 sm:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start lg:gap-16">
            <div>
              <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                Compare the signal
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
                Room for the questions ahead.
              </h2>
              <p className="text-muted-foreground mt-5 max-w-sm text-sm leading-6">
                Every plan includes the core PathLens workflow. The difference
                is how much scale, retention, and collaboration your team needs.
              </p>
            </div>

            <div className="bg-card overflow-x-auto rounded-2xl border">
              <table className="w-full min-w-[42rem] text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="p-4 font-medium sm:p-5">Included</th>
                    {PLAN_TIERS.map((plan) => (
                      <th key={plan.id} className="p-4 font-medium sm:p-5">
                        {plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <th className="text-muted-foreground p-4 text-left font-normal sm:p-5">
                        {row.label}
                      </th>
                      {row.values.map((value, index) => (
                        <td
                          key={`${row.label}-${index}`}
                          className="p-4 sm:p-5"
                        >
                          {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: Database,
                title: 'Data that stays useful',
                detail: 'Retention that matches your review cycle.',
              },
              {
                icon: Users,
                title: 'The right people involved',
                detail: 'Permissions that keep teams moving safely.',
              },
              {
                icon: Gauge,
                title: 'Performance in context',
                detail: 'See experience alongside behavior.',
              },
            ].map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.title}
                  className="bg-card flex items-start gap-3 rounded-xl border p-4"
                >
                  <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-5">
                      {item.detail}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <div>
          <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
            Questions, answered
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Pricing without the fog.
          </h2>
          <p className="text-muted-foreground mt-5 max-w-sm text-sm leading-6">
            Start with a clear answer and invite your team when the time is
            right.
          </p>
        </div>
        <div className="divide-y">
          {pricingFaqs.map((faq) => (
            <details
              key={faq.question}
              className="group py-5 first:pt-0 last:pb-0"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium marker:hidden [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-90" />
              </summary>
              <p className="text-muted-foreground max-w-xl pt-3 text-sm leading-6">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-y px-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-violet-500/15" />
        <div className="mx-auto flex max-w-3xl flex-col items-center py-20 text-center sm:py-28">
          <ShieldCheck className="size-8 text-cyan-500" />
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">
            Start with the signal you need today.
          </h2>
          <p className="text-muted-foreground mt-5 max-w-md text-sm leading-6 sm:text-base">
            No sales call required. Create a workspace and see how PathLens fits
            your product questions.
          </p>
          <Button className="mt-8" size="lg" render={<Link to="/sign-up" />}>
            Create your free workspace
            <ArrowUpRight />
          </Button>
        </div>
      </section>
    </MarketingShell>
  )
}
