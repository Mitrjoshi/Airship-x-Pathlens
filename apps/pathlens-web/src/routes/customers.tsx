import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  BarChart3,
  Check,
  Clock3,
  Layers3,
  MessageCircle,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'

import { MarketingShell } from '@/components/marketing/marketing-shell'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'

export const Route = createFileRoute('/customers')({
  component: CustomersPage,
  staticData: {
    breadcrumb: 'Customers',
  },
})

const stories = [
  {
    quote:
      'PathLens gives our team the context we used to spend hours stitching together.',
    name: 'Maya Chen',
    role: 'Head of Product, Northstar',
    initials: 'MC',
    accent: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
  },
  {
    quote:
      'We finally see where users get stuck without compromising the trust they gave us.',
    name: 'Jon Bell',
    role: 'Founder, Relay Studio',
    initials: 'JB',
    accent: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300',
  },
  {
    quote:
      'The signal-to-noise ratio is incredible. Every dashboard answers a real question.',
    name: 'Priya Raman',
    role: 'Growth Lead, Cedar',
    initials: 'PR',
    accent: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  },
] as const

const teams = [
  {
    icon: BarChart3,
    title: 'Product teams',
    description:
      'Prioritize what to improve with evidence from real journeys, not only survey memory.',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  },
  {
    icon: TrendingUp,
    title: 'Growth teams',
    description:
      'Connect acquisition sources to the behavior and conversion that follows.',
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  },
  {
    icon: ShieldCheck,
    title: 'Engineering teams',
    description:
      'See errors, performance, and replay context before a support ticket becomes a mystery.',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  },
] as const

function CustomersPage() {
  return (
    <MarketingShell active="customers">
      <section className="relative isolate overflow-hidden border-b px-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 right-[-8rem] size-[38rem] rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute top-24 left-[-12rem] size-[30rem] rounded-full bg-cyan-400/10 blur-3xl" />
        </div>
        <div className="mx-auto grid max-w-7xl gap-12 py-20 sm:py-28 lg:grid-cols-[1fr_0.85fr] lg:items-center lg:gap-20">
          <div>
            <Badge variant="outline" className="mb-6">
              <MessageCircle /> Customer stories
            </Badge>
            <h1 className="max-w-2xl text-5xl leading-[0.95] font-semibold tracking-[-0.075em] sm:text-7xl">
              Less guessing. More momentum.
            </h1>
            <p className="text-muted-foreground mt-7 max-w-xl text-base leading-7 sm:text-lg sm:leading-8">
              The teams using PathLens do not need more dashboards. They need a
              clearer reason to act, shared across the people building the
              product.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button size="lg" render={<Link to="/sign-up" />}>
                Start for free
                <ArrowUpRight />
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link to="/product" />}
              >
                Explore the product
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-cyan-500/15 to-violet-500/20 blur-2xl" />
            <div className="bg-card relative rounded-2xl border p-5 shadow-xl sm:p-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <p className="text-xs font-medium">What teams get back</p>
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    More clarity per review cycle
                  </p>
                </div>
                <Sparkles className="size-5 text-violet-500" />
              </div>
              <div className="grid grid-cols-3 divide-x py-6">
                <div className="px-3 first:pl-0">
                  <p className="text-muted-foreground text-[10px] uppercase">
                    Signals
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    24.8k
                  </p>
                  <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                    understood
                  </p>
                </div>
                <div className="px-3">
                  <p className="text-muted-foreground text-[10px] uppercase">
                    Time
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    12h
                  </p>
                  <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                    saved weekly
                  </p>
                </div>
                <div className="px-3 last:pr-0">
                  <p className="text-muted-foreground text-[10px] uppercase">
                    Teams
                  </p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">
                    4
                  </p>
                  <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                    in one view
                  </p>
                </div>
              </div>
              <div className="bg-muted/40 rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                    <Check className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-medium">A useful signal found</p>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      Mobile visitors drop after pricing on /checkout.
                    </p>
                  </div>
                  <ArrowUpRight className="text-muted-foreground ml-auto size-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
            A shared point of view
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Every team sees the same story.
          </h2>
          <p className="text-muted-foreground mt-5 text-sm leading-6 sm:text-base">
            Connect the details that used to live in separate dashboards,
            tickets, and opinions.
          </p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {teams.map((team) => {
            const Icon = team.icon

            return (
              <article
                key={team.title}
                className="bg-card rounded-2xl border p-6 sm:p-8"
              >
                <span
                  className={`flex size-10 items-center justify-center rounded-xl ${team.color}`}
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">
                  {team.title}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {team.description}
                </p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="bg-muted/10 border-y px-5 sm:px-8">
        <div className="mx-auto max-w-7xl py-20 sm:py-28">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
                From the teams
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
                The detail is the difference.
              </h2>
            </div>
            <div className="bg-background/70 flex items-center gap-3 rounded-full border px-3.5 py-2 shadow-sm backdrop-blur">
              <span
                className="tracking-[0.16em] text-amber-500"
                aria-label="5 out of 5 stars"
              >
                ★★★★★
              </span>
              <span className="text-muted-foreground text-xs">
                4.9 / 5 from early teams
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <figure className="bg-background/80 flex min-h-72 flex-col justify-between rounded-2xl border p-6 shadow-sm backdrop-blur sm:p-8">
              <span className="bg-gradient-to-br from-cyan-400 to-blue-500 bg-clip-text text-7xl leading-none font-semibold text-transparent">
                “
              </span>
              <blockquote className="-mt-3 max-w-2xl text-xl leading-8 font-medium tracking-[-0.03em] sm:text-2xl sm:leading-9">
                “{stories[0].quote}”
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-3">
                <span
                  className={`flex size-10 items-center justify-center rounded-full text-xs font-semibold ${stories[0].accent}`}
                >
                  {stories[0].initials}
                </span>
                <span>
                  <span className="block text-sm font-medium">
                    {stories[0].name}
                  </span>
                  <span className="text-muted-foreground mt-0.5 block text-xs">
                    {stories[0].role}
                  </span>
                </span>
              </figcaption>
            </figure>

            <div className="grid gap-4">
              {stories.slice(1).map((story) => (
                <figure
                  key={story.name}
                  className="bg-background/70 flex flex-col justify-between rounded-2xl border p-5 shadow-sm backdrop-blur sm:p-6"
                >
                  <div>
                    <span className="text-xs tracking-[0.16em] text-amber-500">
                      ★★★★★
                    </span>
                    <blockquote className="mt-4 text-sm leading-6">
                      “{story.quote}”
                    </blockquote>
                  </div>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <span
                      className={`flex size-8 items-center justify-center rounded-full text-[10px] font-semibold ${story.accent}`}
                    >
                      {story.initials}
                    </span>
                    <span>
                      <span className="block text-xs font-medium">
                        {story.name}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-[10px]">
                        {story.role}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Clock3, value: '12 hrs', label: 'saved every week' },
            {
              icon: MousePointerClick,
              value: '24.8k',
              label: 'signals understood',
            },
            { icon: Users, value: 'One view', label: 'for the whole team' },
          ].map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.label}
                className="bg-card flex items-center gap-3 rounded-2xl border p-5 sm:p-6"
              >
                <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <Icon className="size-4" />
                </span>
                <span>
                  <strong className="block text-lg font-semibold tracking-tight">
                    {item.value}
                  </strong>
                  <span className="text-muted-foreground text-xs">
                    {item.label}
                  </span>
                </span>
              </div>
            )
          })}
        </div>

        <div className="mt-16 grid gap-8 rounded-2xl border bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-6 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <Layers3 className="size-7 text-cyan-500" />
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
              Build with the details in the room.
            </h2>
            <p className="text-muted-foreground mt-4 max-w-xl text-sm leading-6">
              Give your team the evidence to move from a traffic change to the
              actual moment that explains it.
            </p>
          </div>
          <Button size="lg" render={<Link to="/sign-up" />}>
            Create a workspace
            <ArrowUpRight />
          </Button>
        </div>
      </section>
    </MarketingShell>
  )
}
