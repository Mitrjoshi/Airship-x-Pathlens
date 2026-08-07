import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import {
  ActivityIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  BarChart3Icon,
  CheckIcon,
  ChevronDownIcon,
  CirclePlayIcon,
  Clock3Icon,
  Globe2Icon,
  Layers3Icon,
  LockKeyholeIcon,
  MousePointerClickIcon,
  ScanSearchIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ZapIcon,
} from 'lucide-react'

import { ModeToggle } from '@/components/common/mode-toggle'
import { useInView } from '@/hooks/use-in-view'
import { Button } from '@workspace/ui/components/button'

export const Route = createFileRoute('/')({
  component: LandingPage,
  beforeLoad: () => {
    const token = localStorage.getItem('pathlens-token')

    if (token) {
      throw redirect({ to: '/app' })
    }
  },
})

function LandingPage() {
  const { ref: heroRef, isInView: heroInView } = useInView<HTMLElement>()
  const { ref: productRef, isInView: productInView } = useInView<HTMLElement>()
  const { ref: featuresRef, isInView: featuresInView } =
    useInView<HTMLElement>()
  const { ref: testimonialsRef, isInView: testimonialsInView } =
    useInView<HTMLElement>()
  const { ref: faqRef, isInView: faqInView } = useInView<HTMLElement>()
  const { ref: ctaRef, isInView: ctaInView } = useInView<HTMLElement>()

  const eventRows = [
    { label: 'Button clicked', detail: 'Get started', time: '2s ago' },
    { label: 'Page viewed', detail: '/pricing', time: '8s ago' },
    { label: 'Signup completed', detail: 'Acme workspace', time: '14s ago' },
    { label: 'Session started', detail: 'San Francisco, US', time: '21s ago' },
  ]

  const testimonials = [
    {
      quote:
        'PathLens gives our team the context we used to spend hours stitching together.',
      name: 'Maya Chen',
      role: 'Head of Product, Northstar',
      initials: 'MC',
      color: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
    },
    {
      quote:
        'We finally see where users get stuck without compromising the trust they gave us.',
      name: 'Jon Bell',
      role: 'Founder, Relay Studio',
      initials: 'JB',
      color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300',
    },
    {
      quote:
        'The signal-to-noise ratio is incredible. Every dashboard answers a real question.',
      name: 'Priya Raman',
      role: 'Growth Lead, Cedar',
      initials: 'PR',
      color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    },
  ]

  const faqs = [
    {
      question: 'How quickly can I get started?',
      answer:
        'Add one lightweight script to your site, create a project, and your first signals will start arriving in minutes.',
    },
    {
      question: 'Is PathLens privacy-friendly?',
      answer:
        'Yes. PathLens focuses on useful product signals while keeping your analytics setup privacy-first by default.',
    },
    {
      question: 'What can I track?',
      answer:
        'Track page views, custom events, funnels, performance signals, and privacy-conscious session replays.',
    },
    {
      question: 'Can my whole team use it?',
      answer:
        'Yes. Workspaces and projects make it simple to give everyone the right view of the customer journey.',
    },
  ]

  return (
    <main className="bg-background min-h-screen overflow-hidden scroll-smooth">
      <div className="border-border bg-background text-foreground border-b px-5 py-2 text-center text-xs sm:px-8">
        <span className="inline-flex items-center gap-2">
          <SparklesIcon className="size-3.5 text-cyan-300" />
          New: understand every customer path in one place
          <a
            className="font-medium underline underline-offset-4"
            href="#features"
          >
            Explore the product
          </a>
        </span>
      </div>

      <header className="border-border/60 bg-background/80 sticky top-0 z-20 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link
            to="/"
            className="flex items-center gap-2.5 font-semibold tracking-tight"
          >
            <span className="bg-background/80 ring-foreground/10 size-8 overflow-hidden rounded-lg shadow-sm ring-1">
              <img
                src="/logo.png"
                alt="PathLens"
                className="landing-logo size-full object-contain"
              />
            </span>
            PathLens
          </Link>

          <nav className="text-muted-foreground hidden items-center gap-7 text-sm md:flex">
            <a
              className="hover:text-foreground transition-colors"
              href="#features"
            >
              Product
            </a>
            <a
              className="hover:text-foreground transition-colors"
              href="#stories"
            >
              Customers
            </a>
            <a className="hover:text-foreground transition-colors" href="#faq">
              Resources
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" render={<Link to="/login" />}>
              Log in
            </Button>
            <Button render={<Link to="/sign-up" />}>Start free</Button>
          </div>
        </div>
      </header>

      <section
        ref={heroRef}
        className={`relative isolate border-b px-5 sm:px-8 ${heroInView ? 'is-visible' : ''}`}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-14rem] left-1/2 h-[42rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,var(--color-cyan-400)_0%,transparent_62%)] opacity-20 blur-3xl dark:opacity-25" />
          <div className="absolute top-[-8rem] left-[12%] h-96 w-96 rounded-full bg-[radial-gradient(circle,var(--color-violet-400)_0%,transparent_70%)] opacity-15 blur-3xl dark:opacity-20" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,oklch(0.5_0_0/0.07)_1px,transparent_1px),linear-gradient(to_bottom,oklch(0.5_0_0/0.07)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_75%)] bg-[size:48px_48px]" />
        </div>

        <div
          className={`landing-reveal mx-auto flex min-h-[30rem] max-w-5xl flex-col items-center justify-center py-20 text-center sm:min-h-[36rem] sm:py-24 ${heroInView ? 'is-visible' : ''}`}
        >
          <div className="border-border/80 bg-background/70 text-muted-foreground mb-8 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs shadow-sm backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            Privacy-first analytics for modern teams
            <ArrowRightIcon className="size-3.5" />
          </div>
          <h1 className="max-w-5xl text-5xl leading-[0.94] font-semibold tracking-[-0.075em] sm:text-7xl lg:text-[6.6rem]">
            <span>Make every </span>
            <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 bg-clip-text text-transparent">
              click count.
            </span>
          </h1>
          <p className="text-muted-foreground mt-8 max-w-2xl text-base leading-7 sm:text-xl sm:leading-8">
            The calm, complete view of your customer journey. Watch what users
            do, find what matters, and improve your product with confidence.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" render={<Link to="/sign-up" />}>
              Start for free
              <ArrowUpRightIcon />
            </Button>
            <Button size="lg" variant="outline" render={<Link to="/login" />}>
              See how it works
              <CirclePlayIcon />
            </Button>
          </div>
          <div className="text-muted-foreground mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="size-3.5 text-emerald-500" />
              No credit card
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="size-3.5 text-emerald-500" />
              Setup in minutes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckIcon className="size-3.5 text-emerald-500" />
              Privacy by default
            </span>
          </div>
        </div>

        <div
          className={`landing-reveal mx-auto max-w-6xl pb-16 [transition-delay:180ms] sm:pb-20 ${heroInView ? 'is-visible' : ''}`}
        >
          <div className="landing-float relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-violet-500/20 blur-2xl" />
            <div className="bg-card relative overflow-hidden rounded-2xl border shadow-2xl shadow-blue-950/10 dark:shadow-black/50">
              <div className="bg-muted/20 flex items-center justify-between border-b px-4 py-3 sm:px-6">
                <div className="flex items-center gap-2.5">
                  <span className="bg-background/80 ring-foreground/10 size-6 overflow-hidden rounded-md ring-1">
                    <img
                      src="/logo.png"
                      alt=""
                      className="landing-logo size-full object-contain"
                    />
                  </span>
                  <span className="text-xs font-medium">Acme / Overview</span>
                  <span className="text-muted-foreground hidden text-xs sm:inline">
                    ·
                  </span>
                  <span className="text-muted-foreground hidden text-xs sm:inline">
                    Last 7 days
                  </span>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Collecting data
                </span>
              </div>

              <div className="grid divide-y lg:grid-cols-[0.82fr_1.18fr] lg:divide-x lg:divide-y-0">
                <div className="grid grid-cols-3 divide-x p-4 sm:p-6 lg:block lg:space-y-5 lg:divide-x-0 lg:p-8">
                  <div className="px-3 first:pl-0 last:pr-0 lg:px-0">
                    <p className="text-muted-foreground text-[10px] uppercase">
                      Visitors
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight sm:text-3xl">
                      24.8k
                    </p>
                    <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      +18.4% this week
                    </p>
                  </div>
                  <div className="px-3 first:pl-0 last:pr-0 lg:px-0">
                    <p className="text-muted-foreground text-[10px] uppercase">
                      Sessions
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight sm:text-3xl">
                      18.2k
                    </p>
                    <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      +12.1% this week
                    </p>
                  </div>
                  <div className="px-3 first:pl-0 last:pr-0 lg:px-0">
                    <p className="text-muted-foreground text-[10px] uppercase">
                      Conversion
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight sm:text-3xl">
                      14.6%
                    </p>
                    <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                      +4.6% this week
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-6 lg:p-8">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">Visitor activity</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        A clearer view of your growth
                      </p>
                    </div>
                    <div className="border-border bg-muted/40 flex items-center gap-1 rounded-md border px-2 py-1 text-[10px]">
                      <Clock3Icon className="text-muted-foreground size-3" />7
                      days
                    </div>
                  </div>
                  <div className="relative mt-8 h-44 overflow-hidden rounded-lg bg-gradient-to-b from-blue-500/10 to-transparent p-3 sm:h-56">
                    <div className="border-foreground/10 absolute inset-x-3 top-1/4 border-t border-dashed" />
                    <div className="border-foreground/10 absolute inset-x-3 top-2/4 border-t border-dashed" />
                    <div className="border-foreground/10 absolute inset-x-3 top-3/4 border-t border-dashed" />
                    <svg
                      className="absolute inset-3 size-[calc(100%-1.5rem)] overflow-visible"
                      viewBox="0 0 800 240"
                      preserveAspectRatio="none"
                      fill="none"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient
                          id="hero-line"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop stopColor="#06b6d4" />
                          <stop offset="0.5" stopColor="#3b82f6" />
                          <stop offset="1" stopColor="#8b5cf6" />
                        </linearGradient>
                        <linearGradient
                          id="hero-fill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop stopColor="#3b82f6" stopOpacity="0.28" />
                          <stop
                            offset="1"
                            stopColor="#3b82f6"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 205 C80 188 96 156 160 172 S250 118 310 142 S400 68 456 100 S560 115 620 55 S725 66 800 20 V240 H0Z"
                        fill="url(#hero-fill)"
                      />
                      <path
                        d="M0 205 C80 188 96 156 160 172 S250 118 310 142 S400 68 456 100 S560 115 620 55 S725 66 800 20"
                        stroke="url(#hero-line)"
                        strokeWidth="5"
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        cx="620"
                        cy="55"
                        r="7"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="4"
                      />
                    </svg>
                    <div className="text-muted-foreground absolute inset-x-3 bottom-2 flex justify-between text-[10px]">
                      <span>May 12</span>
                      <span>May 18</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={productRef}
        id="features"
        className={`landing-reveal mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28 ${productInView ? 'is-visible' : ''}`}
      >
        <div className="mb-10 flex flex-col justify-between gap-5 sm:mb-12 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
              Everything in one view
            </p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
              The whole story, not just the numbers.
            </h2>
          </div>
          <p className="text-muted-foreground max-w-sm text-sm leading-6">
            Every tool is designed to answer the question behind the metric.
          </p>
        </div>

        <div className="grid min-w-0 auto-rows-[minmax(13rem,auto)] grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="group bg-card/80 relative min-w-0 overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8 lg:col-span-8">
            <div className="absolute -right-24 -bottom-24 size-72 rounded-full bg-blue-500/15 blur-3xl transition-transform duration-700 group-hover:scale-125" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <BarChart3Icon className="size-5" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold tracking-tight">
                    Know what is working
                  </h3>
                  <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-6">
                    Spot trends, compare channels, and move from “what
                    happened?” to “what should we do?” instantly.
                  </p>
                </div>
                <span className="hidden rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[10px] text-blue-600 sm:inline dark:text-blue-300">
                  Realtime
                </span>
              </div>
              <div className="bg-muted/30 mt-8 rounded-xl border p-4 shadow-sm backdrop-blur sm:p-5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Conversion by source</span>
                  <span className="text-muted-foreground">This month</span>
                </div>
                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-1.5 flex justify-between text-[11px]">
                      <span>Organic search</span>
                      <span className="text-muted-foreground">42.8%</span>
                    </div>
                    <div className="bg-muted h-2 rounded-full">
                      <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-[11px]">
                      <span>Product hunt</span>
                      <span className="text-muted-foreground">31.4%</span>
                    </div>
                    <div className="bg-muted h-2 rounded-full">
                      <div className="h-full w-[64%] rounded-full bg-gradient-to-r from-blue-500 to-violet-500" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-[11px]">
                      <span>Direct</span>
                      <span className="text-muted-foreground">26.1%</span>
                    </div>
                    <div className="bg-muted h-2 rounded-full">
                      <div className="h-full w-[52%] rounded-full bg-gradient-to-r from-violet-500 to-blue-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-card/80 relative min-w-0 overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8 lg:col-span-4">
            <div className="absolute -top-12 -right-12 size-40 rounded-full bg-violet-500/15 blur-3xl transition-transform duration-700 group-hover:scale-150" />
            <div className="relative">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <CirclePlayIcon className="size-5" />
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">
                Replay the moments
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                See the friction, not a filtered summary of it.
              </p>
              <div className="bg-muted/30 mt-6 rounded-lg border p-3 shadow-sm">
                <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-slate-900 via-blue-950 to-violet-950">
                  <div className="absolute inset-0 [background-image:linear-gradient(oklch(1_0_0/0.12)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.12)_1px,transparent_1px)] [background-size:20px_20px] opacity-30" />
                  <span className="relative flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 text-slate-950 shadow-xl">
                    <CirclePlayIcon className="ml-0.5 size-4 fill-current" />
                  </span>
                </div>
                <div className="text-muted-foreground mt-3 flex items-center justify-between text-[10px]">
                  <span>Session #4912</span>
                  <span>02:14</span>
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-card/80 relative min-w-0 overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8 lg:col-span-4">
            <div className="relative">
              <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                <ScanSearchIcon className="size-5" />
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">
                Find the hotspots
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Turn every click and scroll into a clearer next step.
              </p>
              <div className="relative mx-auto mt-6 flex aspect-video max-w-xs items-center justify-center overflow-hidden rounded-lg border bg-slate-950">
                <div className="absolute inset-0 [background-image:linear-gradient(oklch(1_0_0/0.12)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.12)_1px,transparent_1px)] [background-size:18px_18px] opacity-20" />
                <div className="absolute top-4 left-8 size-14 rounded-full bg-cyan-400/40 blur-xl" />
                <div className="absolute right-8 bottom-4 size-20 rounded-full bg-blue-500/50 blur-xl" />
                <div className="absolute top-1/2 left-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/40 blur-xl" />
                <div className="relative grid w-2/3 gap-1.5 opacity-80">
                  <span className="h-2 rounded bg-cyan-300/70" />
                  <span className="h-2 w-3/4 rounded bg-blue-200/50" />
                  <span className="mt-2 h-5 rounded border border-cyan-200/30" />
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-card/80 relative min-w-0 overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8 lg:col-span-4">
            <div className="relative">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                <ZapIcon className="size-5" />
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">
                Watch events flow
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Every important interaction, organized and ready to explore.
              </p>
              <div className="mt-6 space-y-2">
                {eventRows.slice(0, 3).map((event, index) => (
                  <div
                    key={event.label}
                    className="bg-background/70 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[10px] shadow-sm"
                    style={{ transitionDelay: `${index * 80}ms` }}
                  >
                    <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {event.label}
                    </span>
                    <span className="text-muted-foreground shrink-0">
                      {event.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card/80 relative min-w-0 overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8 lg:col-span-4">
            <div className="relative">
              <div className="flex size-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                <ShieldCheckIcon className="size-5" />
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">
                Privacy without compromise
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Useful product intelligence with a respectful default.
              </p>
              <div className="bg-background/70 mt-6 flex items-center gap-3 rounded-lg border p-3 shadow-sm">
                <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                  <LockKeyholeIcon className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-medium">Privacy score</p>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    Built for trust
                  </p>
                </div>
                <span className="ml-auto text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  A+
                </span>
              </div>
            </div>
          </div>

          <div className="bg-card/80 relative min-w-0 overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8 lg:col-span-4">
            <div className="relative">
              <div className="flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <ActivityIcon className="size-5" />
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight">
                Stay ahead of slow
              </h3>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                Performance context where your team can act on it.
              </p>
              <div className="bg-background/70 mt-6 flex items-end gap-3 rounded-lg border p-4 shadow-sm">
                <div className="relative flex size-16 items-center justify-center rounded-full bg-[conic-gradient(#8b5cf6_0_94%,var(--muted)_94%_100%)]">
                  <div className="bg-background flex size-12 items-center justify-center rounded-full text-sm font-semibold">
                    94
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-medium">Performance</p>
                  <p className="text-muted-foreground mt-0.5 text-[10px]">
                    Excellent this week
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card/80 relative min-w-0 overflow-hidden rounded-2xl border p-6 shadow-sm sm:p-8 lg:col-span-8">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div>
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-300">
                  <Layers3Icon className="size-5" />
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">
                  From signal to decision
                </h3>
                <p className="text-muted-foreground mt-2 max-w-sm text-sm leading-6">
                  Connect the dots across your whole product without jumping
                  between tools.
                </p>
              </div>
              <div className="grid w-full max-w-64 grid-cols-3 gap-2 text-center text-[10px]">
                <div className="bg-background/70 rounded-lg border p-3">
                  <Globe2Icon className="mx-auto mb-2 size-4 text-cyan-500" />
                  <span>Traffic</span>
                </div>
                <div className="bg-background/70 rounded-lg border p-3">
                  <MousePointerClickIcon className="mx-auto mb-2 size-4 text-violet-500" />
                  <span>Behavior</span>
                </div>
                <div className="bg-background/70 rounded-lg border p-3">
                  <SparklesIcon className="mx-auto mb-2 size-4 text-violet-500" />
                  <span>Insights</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={featuresRef}
        id="how-it-works"
        className={`landing-reveal bg-muted/20 relative isolate overflow-hidden border-y px-5 sm:px-8 ${featuresInView ? 'is-visible' : ''}`}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_50%,oklch(0.75_0.16_210/0.12),transparent_28%),radial-gradient(circle_at_82%_50%,oklch(0.65_0.2_285/0.12),transparent_28%)]" />
        <div className="mx-auto max-w-7xl py-20 sm:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
              Built for better decisions
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Your team sees the same story.
            </h2>
            <p className="text-muted-foreground mt-5 text-sm leading-6 sm:text-base">
              From the first event to the next product decision, PathLens keeps
              the signal connected.
            </p>
          </div>

          <div className="relative mx-auto mt-12 max-w-6xl">
            <div className="absolute top-9 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-cyan-400/0 via-blue-500/60 to-violet-500/0 sm:block" />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="bg-card/80 relative rounded-2xl border border-t-cyan-400/70 p-5 shadow-sm backdrop-blur sm:p-6">
                <div className="relative z-10 flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-full bg-cyan-500 text-xs font-semibold text-slate-950 shadow-lg shadow-cyan-500/20">
                    01
                  </span>
                  <Layers3Icon className="size-5 text-cyan-500" />
                </div>
                <h3 className="mt-8 text-base font-semibold tracking-tight">
                  Add one script
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  Install in minutes. No complicated setup or data pipeline
                  required.
                </p>
                <div className="border-border bg-muted/40 mt-7 overflow-hidden rounded-lg border px-3 py-3 font-mono text-[10px] shadow-inner">
                  <div className="mb-2 flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-cyan-400" />
                    <span className="text-muted-foreground">index.html</span>
                  </div>
                  <p className="text-muted-foreground truncate">
                    <span className="text-cyan-500">&lt;script</span>{' '}
                    <span className="text-blue-500">src</span>=
                    <span className="text-violet-500">
                      &quot;pathlens.js&quot;
                    </span>
                    <span className="text-cyan-500"> /&gt;</span>
                  </p>
                </div>
              </div>

              <div className="bg-card/80 relative rounded-2xl border border-t-blue-500/70 p-5 shadow-sm backdrop-blur sm:p-6">
                <div className="relative z-10 flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white shadow-lg shadow-blue-500/20">
                    02
                  </span>
                  <ActivityIcon className="size-5 text-blue-500" />
                </div>
                <h3 className="mt-8 text-base font-semibold tracking-tight">
                  See the signal
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  Watch your users move through your product in real time.
                </p>
                <div className="border-border bg-muted/40 mt-7 space-y-2 rounded-lg border p-3 shadow-inner">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="flex-1 font-medium">Signup completed</span>
                    <span className="text-muted-foreground">now</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="size-1.5 rounded-full bg-blue-500" />
                    <span className="flex-1 font-medium">Pricing viewed</span>
                    <span className="text-muted-foreground">4s</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="size-1.5 rounded-full bg-violet-500" />
                    <span className="flex-1 font-medium">Session started</span>
                    <span className="text-muted-foreground">9s</span>
                  </div>
                </div>
              </div>

              <div className="bg-card/80 relative rounded-2xl border border-t-violet-500/70 p-5 shadow-sm backdrop-blur sm:p-6">
                <div className="relative z-10 flex items-center justify-between">
                  <span className="flex size-8 items-center justify-center rounded-full bg-violet-500 text-xs font-semibold text-white shadow-lg shadow-violet-500/20">
                    03
                  </span>
                  <ZapIcon className="size-5 text-violet-500" />
                </div>
                <h3 className="mt-8 text-base font-semibold tracking-tight">
                  Make the move
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  Turn a clear insight into a better experience for everyone.
                </p>
                <div className="border-border bg-muted/40 mt-7 rounded-lg border p-3 shadow-inner">
                  <div className="flex items-start gap-2">
                    <SparklesIcon className="mt-0.5 size-3.5 shrink-0 text-violet-500" />
                    <div>
                      <p className="text-[10px] font-medium">A useful signal</p>
                      <p className="text-muted-foreground mt-1 text-[10px] leading-4">
                        Visitors drop after pricing on mobile.
                      </p>
                    </div>
                    <ArrowUpRightIcon className="ml-auto size-3.5 text-violet-500" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={testimonialsRef}
        id="stories"
        className={`landing-reveal bg-muted/10 border-b px-5 py-20 sm:px-8 sm:py-28 ${testimonialsInView ? 'is-visible' : ''}`}
      >
        <div className="via-background relative isolate mx-auto max-w-7xl overflow-hidden rounded-[2rem] border bg-gradient-to-br from-cyan-500/10 to-violet-500/10 p-5 shadow-sm sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -top-32 left-1/3 -z-10 size-80 rounded-full bg-blue-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -bottom-32 -z-10 size-80 rounded-full bg-violet-500/15 blur-3xl" />

          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
                Loved by thoughtful teams
              </p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
                Less guessing. More momentum.
              </h2>
              <p className="text-muted-foreground mt-4 max-w-lg text-sm leading-6">
                The teams using PathLens do not need more dashboards. They need
                a clearer reason to act.
              </p>
            </div>
            <div className="border-border bg-background/70 flex w-fit items-center gap-3 rounded-full border px-3.5 py-2 shadow-sm backdrop-blur">
              <span
                className="text-sm tracking-[0.16em] text-amber-500"
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
            <figure className="bg-background/80 relative flex min-h-72 flex-col justify-between overflow-hidden rounded-2xl border p-6 shadow-sm backdrop-blur sm:p-8">
              <span className="bg-gradient-to-br from-cyan-400 to-blue-500 bg-clip-text text-7xl leading-none font-semibold text-transparent">
                “
              </span>
              <blockquote className="-mt-3 max-w-2xl text-xl leading-8 font-medium tracking-[-0.03em] sm:text-2xl sm:leading-9">
                “{testimonials[0].quote}”
              </blockquote>
              <figcaption className="mt-8 flex items-center justify-between gap-4">
                <span className="flex items-center gap-3">
                  <span
                    className={`flex size-10 items-center justify-center rounded-full text-xs font-semibold ${testimonials[0].color}`}
                  >
                    {testimonials[0].initials}
                  </span>
                  <span>
                    <span className="block text-sm font-medium">
                      {testimonials[0].name}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs">
                      {testimonials[0].role}
                    </span>
                  </span>
                </span>
                <span className="text-muted-foreground hidden items-center gap-1.5 text-xs sm:flex">
                  <CheckIcon className="size-3.5 text-emerald-500" />
                  Product team
                </span>
              </figcaption>
            </figure>

            <div className="grid gap-4">
              {testimonials.slice(1).map((testimonial) => (
                <figure
                  key={testimonial.name}
                  className="bg-background/70 flex flex-col justify-between rounded-2xl border p-5 shadow-sm backdrop-blur transition-transform duration-300 hover:-translate-y-1 sm:p-6"
                >
                  <div>
                    <span className="text-xs tracking-[0.16em] text-amber-500">
                      ★★★★★
                    </span>
                    <blockquote className="mt-4 text-sm leading-6">
                      “{testimonial.quote}”
                    </blockquote>
                  </div>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <span
                      className={`flex size-8 items-center justify-center rounded-full text-[10px] font-semibold ${testimonial.color}`}
                    >
                      {testimonial.initials}
                    </span>
                    <span>
                      <span className="block text-xs font-medium">
                        {testimonial.name}
                      </span>
                      <span className="text-muted-foreground mt-0.5 block text-[10px]">
                        {testimonial.role}
                      </span>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>

          <div className="border-border/70 mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3">
            <div className="flex items-center gap-3 px-1">
              <span className="flex size-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-300">
                <ActivityIcon className="size-4" />
              </span>
              <span>
                <strong className="block text-sm font-semibold">24.8k</strong>
                <span className="text-muted-foreground text-[10px]">
                  signals understood
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3 px-1">
              <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300">
                <Clock3Icon className="size-4" />
              </span>
              <span>
                <strong className="block text-sm font-semibold">12 hrs</strong>
                <span className="text-muted-foreground text-[10px]">
                  saved every week
                </span>
              </span>
            </div>
            <div className="flex items-center gap-3 px-1">
              <span className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300">
                <SparklesIcon className="size-4" />
              </span>
              <span>
                <strong className="block text-sm font-semibold">
                  One view
                </strong>
                <span className="text-muted-foreground text-[10px]">
                  for the whole team
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        ref={faqRef}
        id="faq"
        className={`landing-reveal border-t px-5 sm:px-8 ${faqInView ? 'is-visible' : ''}`}
      >
        <div className="mx-auto grid max-w-7xl gap-8 py-20 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
              Questions, answered
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
              A clearer start.
            </h2>
            <p className="text-muted-foreground mt-5 max-w-sm text-sm leading-6">
              Everything you need to know before your first signal arrives.
            </p>
          </div>
          <div className="divide-y">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group py-5 first:pt-0 last:pb-0"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium marker:hidden [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <ChevronDownIcon className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-muted-foreground max-w-xl pt-3 text-sm leading-6">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section
        ref={ctaRef}
        className={`landing-reveal relative isolate overflow-hidden border-y px-5 sm:px-8 ${ctaInView ? 'is-visible' : ''}`}
      >
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-violet-500/15" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/15 blur-3xl" />
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
            Start for free <ArrowUpRightIcon />
          </Button>
        </div>
      </section>

      <footer
        className="border-border bg-background text-foreground border-t"
        id="footer"
      >
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
          <div className="grid gap-12 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
            <div>
              <Link
                to="/"
                className="flex items-center gap-2.5 font-semibold tracking-tight"
              >
                <span className="bg-muted/40 ring-border size-8 overflow-hidden rounded-lg ring-1">
                  <img
                    src="/logo.png"
                    alt="PathLens"
                    className="landing-logo landing-logo-dark size-full object-contain"
                  />
                </span>
                PathLens
              </Link>
              <p className="text-muted-foreground mt-5 max-w-xs text-sm leading-6">
                Calm, complete analytics for teams building what matters.
              </p>
              <p className="text-muted-foreground/70 mt-8 text-xs">
                © 2026 PathLens. All rights reserved.
              </p>
            </div>
            <div>
              <p className="text-muted-foreground/70 text-xs font-medium uppercase">
                Product
              </p>
              <div className="mt-5 space-y-3 text-sm">
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#features"
                >
                  Overview
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#features"
                >
                  Analytics
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#features"
                >
                  Session replay
                </a>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground/70 text-xs font-medium uppercase">
                Resources
              </p>
              <div className="mt-5 space-y-3 text-sm">
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#how-it-works"
                >
                  How it works
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#faq"
                >
                  FAQ
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#stories"
                >
                  Customer stories
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#footer"
                >
                  Support
                </a>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground/70 text-xs font-medium uppercase">
                Company
              </p>
              <div className="mt-5 space-y-3 text-sm">
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#footer"
                >
                  About
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#footer"
                >
                  Contact
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#footer"
                >
                  Careers
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#footer"
                >
                  Status
                </a>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground/70 text-xs font-medium uppercase">
                Legal
              </p>
              <div className="mt-5 space-y-3 text-sm">
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#footer"
                >
                  Privacy
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#footer"
                >
                  Terms
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#footer"
                >
                  Security
                </a>
                <a
                  className="text-muted-foreground hover:text-foreground block"
                  href="#footer"
                >
                  Cookies
                </a>
              </div>
            </div>
          </div>
          <div className="border-border mt-12 flex flex-col items-center justify-between gap-4 border-t pt-6 text-xs sm:flex-row sm:items-center">
            <span className="text-muted-foreground/70">
              Made for the teams who care about the details.
            </span>
            <div className="flex gap-5">
              <a
                className="text-muted-foreground hover:text-foreground"
                href="#footer"
              >
                X / Twitter
              </a>
              <a
                className="text-muted-foreground hover:text-foreground"
                href="#footer"
              >
                LinkedIn
              </a>
              <a
                className="text-muted-foreground hover:text-foreground"
                href="#footer"
              >
                GitHub
              </a>
            </div>
            <ModeToggle />
          </div>
        </div>
      </footer>
    </main>
  )
}
