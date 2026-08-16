import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Check,
  CirclePlay,
  Gauge,
  Globe2,
  Layers3,
  MousePointerClick,
  Route as RouteIcon,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'

import { MarketingShell } from '@/components/marketing/marketing-shell'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'

export const Route = createFileRoute('/product')({
  component: ProductPage,
  staticData: {
    breadcrumb: 'Product',
  },
})

const capabilities = [
  {
    icon: BarChart3,
    title: 'Understand what is working',
    description:
      'See traffic, sources, pages, devices, and conversion trends in one calm view.',
    color: 'blue',
  },
  {
    icon: CirclePlay,
    title: 'Replay the moments',
    description:
      'Watch the sequence behind a conversion, an error, or a visitor who got stuck.',
    color: 'violet',
  },
  {
    icon: ScanSearch,
    title: 'Find the hotspots',
    description:
      'Use clicks and scroll depth to understand which parts of a page earn attention.',
    color: 'cyan',
  },
  {
    icon: RouteIcon,
    title: 'Connect the journey',
    description:
      'Follow visitors through funnels and user journeys instead of isolated events.',
    color: 'emerald',
  },
  {
    icon: Gauge,
    title: 'Keep performance in view',
    description:
      'Compare load timing across browsers, devices, and pages before speed becomes churn.',
    color: 'amber',
  },
  {
    icon: ShieldCheck,
    title: 'Respect the people behind the data',
    description:
      'Privacy-conscious collection and replay controls help teams learn responsibly.',
    color: 'slate',
  },
] as const

const colorStyles = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  slate: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
} as const

function ProductPage() {
  return (
    <MarketingShell active="product">
      <section className="relative isolate overflow-hidden border-b px-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="absolute top-32 right-[-12rem] size-[32rem] rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_0/0.07)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_0/0.07)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_70%)] [background-size:48px_48px]" />
        </div>

        <div className="mx-auto grid max-w-7xl gap-12 py-20 sm:py-28 lg:grid-cols-[0.88fr_1.12fr] lg:items-center lg:gap-16">
          <div>
            <Badge variant="outline" className="mb-6">
              <Sparkles /> Product overview
            </Badge>
            <h1 className="max-w-2xl text-5xl leading-[0.95] font-semibold tracking-[-0.075em] sm:text-7xl">
              See the whole customer journey.
            </h1>
            <p className="text-muted-foreground mt-7 max-w-xl text-base leading-7 sm:text-lg sm:leading-8">
              PathLens brings traffic, behavior, replay, performance, and team
              context into one clear product view, so your next decision starts
              with evidence.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button size="lg" render={<Link to="/sign-up" />}>
                Start for free
                <ArrowUpRight />
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link to="/pricing" />}
              >
                See pricing
                <ArrowRight />
              </Button>
            </div>
            <div className="text-muted-foreground mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-500" />
                Setup in minutes
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-500" />
                Privacy-first defaults
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-500" />
                One connected workspace
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 via-blue-500/15 to-violet-500/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-2xl shadow-blue-950/20">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-6 items-center justify-center rounded-md bg-white/10 text-[10px] font-semibold">
                    P
                  </span>
                  <span className="text-xs font-medium text-white/80">
                    Acme / Signal overview
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                  Collecting data
                </span>
              </div>
              <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
                {[
                  ['Visitors', '24.8k', '+18.4%'],
                  ['Sessions', '18.2k', '+12.1%'],
                  ['Conversion', '14.6%', '+4.6%'],
                ].map(([label, value, change]) => (
                  <div key={label} className="px-3 py-4 sm:px-5 sm:py-5">
                    <p className="text-[10px] text-white/45 uppercase">
                      {label}
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                      {value}
                    </p>
                    <p className="mt-1 text-[10px] text-emerald-300">
                      {change}
                    </p>
                  </div>
                ))}
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">Visitor activity</p>
                    <p className="mt-1 text-xs text-white/45">
                      The signal behind the summary
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/60">
                    <Activity className="size-3" /> 7 days
                  </div>
                </div>
                <div className="relative mt-6 h-44 overflow-hidden rounded-xl bg-gradient-to-b from-blue-500/20 to-transparent p-3 sm:h-56">
                  <div className="absolute inset-3 [background-image:linear-gradient(oklch(1_0_0/0.1)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.1)_1px,transparent_1px)] [background-size:32px_32px] opacity-50" />
                  <svg
                    className="absolute inset-3 size-[calc(100%-1.5rem)] overflow-visible"
                    viewBox="0 0 800 240"
                    preserveAspectRatio="none"
                    fill="none"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient
                        id="product-line"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop stopColor="#67e8f9" />
                        <stop offset="0.5" stopColor="#60a5fa" />
                        <stop offset="1" stopColor="#a78bfa" />
                      </linearGradient>
                      <linearGradient
                        id="product-fill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="1" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 205 C80 188 96 156 160 172 S250 118 310 142 S400 68 456 100 S560 115 620 55 S725 66 800 20 V240 H0Z"
                      fill="url(#product-fill)"
                    />
                    <path
                      d="M0 205 C80 188 96 156 160 172 S250 118 310 142 S400 68 456 100 S560 115 620 55 S725 66 800 20"
                      stroke="url(#product-line)"
                      strokeWidth="5"
                      vectorEffect="non-scaling-stroke"
                    />
                    <circle
                      cx="620"
                      cy="55"
                      r="7"
                      fill="#60a5fa"
                      stroke="white"
                      strokeWidth="4"
                    />
                  </svg>
                  <div className="absolute inset-x-3 bottom-2 flex justify-between text-[10px] text-white/40">
                    <span>May 12</span>
                    <span>May 18</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3 text-[10px] text-white/55 sm:px-6">
                <MousePointerClick className="size-3.5 text-cyan-300" />
                <span className="flex-1">Signup completed</span>
                <span>2s ago</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="analytics"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28"
      >
        <div className="mb-10 flex flex-col justify-between gap-5 sm:mb-12 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              The product
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Every signal has a next question.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-sm text-sm leading-6">
            PathLens gives each answer enough context to become useful, not just
            another dashboard to check.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => {
            const Icon = capability.icon

            return (
              <article
                key={capability.title}
                className="group bg-card/80 relative min-h-56 overflow-hidden rounded-2xl border p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 sm:p-8"
              >
                <div className="absolute -right-16 -bottom-20 size-48 rounded-full bg-blue-500/10 blur-3xl transition-transform duration-500 group-hover:scale-125" />
                <div className="relative">
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl ${colorStyles[capability.color]}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight">
                    {capability.title}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm leading-6">
                    {capability.description}
                  </p>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section id="replay" className="bg-muted/20 border-y px-5 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-12 py-20 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-20">
          <div className="relative order-2 lg:order-1">
            <div className="absolute -inset-5 rounded-[2rem] bg-violet-500/10 blur-2xl" />
            <div className="relative overflow-hidden rounded-2xl border bg-slate-950 p-3 shadow-xl sm:p-4">
              <div className="flex items-center justify-between border-b border-white/10 px-2 pb-3 text-[10px] text-white/55">
                <span className="flex items-center gap-2">
                  <CirclePlay className="size-3.5 text-violet-300" /> Session
                  replay
                </span>
                <span>Session #4912</span>
              </div>
              <div className="relative mt-3 aspect-[1.35] overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-blue-950 to-violet-950">
                <div className="absolute inset-0 [background-image:linear-gradient(oklch(1_0_0/0.1)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.1)_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
                <div className="absolute top-8 left-8 h-3 w-40 rounded bg-white/20" />
                <div className="absolute top-16 left-8 h-2 w-28 rounded bg-white/10" />
                <div className="absolute right-8 bottom-12 h-16 w-28 rounded-lg border border-cyan-200/30 bg-cyan-300/10" />
                <div className="absolute bottom-8 left-8 h-20 w-36 rounded-lg border border-violet-200/20 bg-violet-300/10" />
                <span className="absolute top-[46%] left-[52%] flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 text-slate-950 shadow-xl">
                  <CirclePlay className="ml-0.5 size-5 fill-current" />
                </span>
              </div>
              <div className="flex items-center gap-2 px-2 pt-3 text-[10px] text-white/50">
                <span className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500" />
                <span>02:14</span>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
              Context over assumptions
            </p>
            <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Replay the moment, then fix the reason.
            </h2>
            <p className="text-muted-foreground mt-5 max-w-xl text-sm leading-6 sm:text-base">
              Event rows tell you that something happened. Replay, heatmaps, and
              surrounding context show why. Find friction without asking your
              customers to reproduce it for you.
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              {[
                'Mask inputs and sensitive text by default',
                'Jump from an event directly into its replay moment',
                'Compare clicks and scroll depth on the same page',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-8"
              variant="outline"
              render={<Link to="/sign-up" />}
            >
              Start investigating
              <ArrowUpRight />
            </Button>
          </div>
        </div>
      </section>

      <section
        id="connect"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28"
      >
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
            From signal to decision
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
            One connected workspace for the whole team.
          </h2>
          <p className="text-muted-foreground mt-5 text-sm leading-6 sm:text-base">
            Product, growth, design, and engineering can work from the same
            evidence without stitching together four different tools.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Globe2,
              label: 'Traffic',
              detail: 'Know who arrives and where from.',
            },
            {
              icon: Layers3,
              label: 'Behavior',
              detail: 'See what people do after they arrive.',
            },
            {
              icon: Zap,
              label: 'Action',
              detail: 'Make the next product move obvious.',
            },
          ].map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.label}
                className="bg-card rounded-2xl border p-6 text-center sm:p-8"
              >
                <span className="bg-muted text-foreground mx-auto flex size-11 items-center justify-center rounded-xl">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 font-semibold">{item.label}</h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {item.detail}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-y px-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-violet-500/15" />
        <div className="mx-auto flex max-w-3xl flex-col items-center py-20 text-center sm:py-28">
          <span className="bg-background/80 mb-5 flex size-12 items-center justify-center overflow-hidden rounded-2xl border shadow-sm backdrop-blur">
            <img
              src="/logo.png"
              alt=""
              className="landing-logo size-full object-contain"
            />
          </span>
          <h2 className="text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">
            Make your next move obvious.
          </h2>
          <p className="text-muted-foreground mt-5 max-w-md text-sm leading-6 sm:text-base">
            Start seeing the details that turn good products into great ones.
          </p>
          <Button className="mt-8" size="lg" render={<Link to="/sign-up" />}>
            Start for free
            <ArrowUpRight />
          </Button>
        </div>
      </section>
    </MarketingShell>
  )
}
