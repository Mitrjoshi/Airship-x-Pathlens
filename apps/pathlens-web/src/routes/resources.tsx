import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CircleHelp,
  Code2,
  LockKeyhole,
  Route as RouteIcon,
  ShieldCheck,
} from 'lucide-react'

import { MarketingShell } from '@/components/marketing/marketing-shell'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'

export const Route = createFileRoute('/resources')({
  component: ResourcesPage,
  staticData: {
    breadcrumb: 'Resources',
  },
})

const resources = [
  {
    icon: Code2,
    eyebrow: 'Quick start',
    title: 'Connect your first site',
    description:
      'Create a project, add one lightweight tracker script, and confirm your first visitor signal.',
    href: '#setup',
    color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
  },
  {
    icon: BookOpen,
    eyebrow: 'Product guide',
    title: 'Read the whole story',
    description:
      'Learn how dashboards, events, replay, heatmaps, funnels, and goals fit together.',
    href: '/product',
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Privacy',
    title: 'Build with trust',
    description:
      'Understand the controls that help your team collect useful context responsibly.',
    href: '#privacy',
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  },
  {
    icon: CircleHelp,
    eyebrow: 'FAQ',
    title: 'Get unstuck quickly',
    description:
      'Clear answers for setup, tracking, plans, privacy, and working with your team.',
    href: '#faq',
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
  },
] as const

const faqs = [
  {
    question: 'How quickly can I get started?',
    answer:
      'Create a workspace, add a project, and place the tracker script on your site. Your first signals should start arriving in minutes.',
  },
  {
    question: 'What can I track?',
    answer:
      'PathLens can capture page views, clicks, forms, scrolls, custom events, performance signals, errors, funnels, and privacy-conscious session replays.',
  },
  {
    question: 'How does PathLens approach privacy?',
    answer:
      'Visitors are represented through anonymous identifiers. Replay supports masking inputs and text, blocking elements, and excluding password values from ordinary input activity.',
  },
  {
    question: 'Can the whole team use one workspace?',
    answer:
      'Yes. Workspaces, projects, members, and permission profiles help give each teammate the right view without making everyone an owner.',
  },
] as const

function ResourcesPage() {
  return (
    <MarketingShell active="resources">
      <section className="relative isolate overflow-hidden border-b px-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-40 left-[18%] size-[36rem] rounded-full bg-cyan-400/12 blur-3xl" />
          <div className="absolute top-20 right-[-10rem] size-[32rem] rounded-full bg-violet-500/15 blur-3xl" />
        </div>
        <div className="mx-auto max-w-4xl py-20 text-center sm:py-28">
          <Badge variant="outline" className="mb-6">
            <BookOpen /> Resources
          </Badge>
          <h1 className="text-5xl leading-[0.95] font-semibold tracking-[-0.075em] sm:text-7xl">
            The useful stuff, in one place.
          </h1>
          <p className="text-muted-foreground mx-auto mt-7 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8">
            Everything you need to connect a site, understand the signal, and
            give your team a trustworthy way to act on it.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Button size="lg" render={<Link to="/sign-up" />}>
              Start for free
              <ArrowUpRight />
            </Button>
            <Button size="lg" variant="outline" render={<Link to="/product" />}>
              Explore the product
              <ArrowRight />
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid gap-4 sm:grid-cols-2">
          {resources.map((resource) => {
            const Icon = resource.icon
            const isRoute = resource.href.startsWith('/')

            return (
              <a
                key={resource.title}
                href={resource.href}
                className="group bg-card relative overflow-hidden rounded-2xl border p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 sm:p-8"
              >
                <div className="absolute -right-16 -bottom-20 size-48 rounded-full bg-cyan-500/10 blur-3xl transition-transform duration-500 group-hover:scale-125" />
                <div className="relative flex items-start justify-between gap-4">
                  <span
                    className={`flex size-10 items-center justify-center rounded-xl ${resource.color}`}
                  >
                    <Icon className="size-5" />
                  </span>
                  <ArrowUpRight className="text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="text-muted-foreground mt-7 text-xs font-medium tracking-[0.16em] uppercase">
                  {resource.eyebrow}
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight">
                  {resource.title}
                </h2>
                <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
                  {resource.description}
                </p>
                {isRoute && <span className="sr-only">Open resource</span>}
              </a>
            )
          })}
        </div>
      </section>

      <section id="setup" className="bg-muted/20 border-y px-5 sm:px-8">
        <div className="mx-auto max-w-7xl py-20 sm:py-28">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
            <div>
              <p className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
                Quick start
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
                From zero to first signal.
              </h2>
              <p className="text-muted-foreground mt-5 max-w-sm text-sm leading-6">
                Keep the first run simple. PathLens is designed to help you get
                value before you need a data team.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  number: '01',
                  title: 'Create a workspace',
                  detail:
                    'Give your team a shared home for projects and product signals.',
                },
                {
                  number: '02',
                  title: 'Connect a project',
                  detail:
                    'Add your website address and choose the controls that fit your site.',
                },
                {
                  number: '03',
                  title: 'Add the tracker',
                  detail:
                    'Place one script on your site and start receiving page and session activity.',
                },
                {
                  number: '04',
                  title: 'Find your first insight',
                  detail:
                    'Start with the dashboard, then follow a useful signal into events or replay.',
                },
              ].map((step) => (
                <div
                  key={step.number}
                  className="bg-card flex items-start gap-4 rounded-2xl border p-5 sm:p-6"
                >
                  <span className="bg-foreground text-background flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold">
                    {step.number}
                  </span>
                  <div>
                    <h3 className="font-semibold tracking-tight">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                      {step.detail}
                    </p>
                  </div>
                  <Check className="ml-auto size-4 shrink-0 text-emerald-500" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="privacy"
        className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28"
      >
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center lg:gap-20">
          <div>
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              Privacy approach
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
              Useful context without losing trust.
            </h2>
            <p className="text-muted-foreground mt-5 max-w-xl text-sm leading-6 sm:text-base">
              PathLens is designed to help teams understand behavior without
              asking them to turn people into names and profiles.
            </p>
            <ul className="mt-7 space-y-3 text-sm">
              {[
                'Anonymous visitor and session identifiers',
                'Password inputs excluded from ordinary input activity',
                'Masking for inputs, text, and blocked replay elements',
                'Workspace permissions for the people who can see the data',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-emerald-500/10 blur-2xl" />
            <div className="bg-card relative rounded-2xl border p-6 shadow-xl sm:p-8">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <LockKeyhole className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">
                    Privacy controls you can explain
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm leading-6">
                    Make the collection choices visible to the people who rely
                    on your product.
                  </p>
                </div>
              </div>
              <div className="mt-8 space-y-3">
                {[
                  ['Input masking', 'Enabled'],
                  ['Sensitive text', 'Protected'],
                  ['Replay controls', 'Configured'],
                ].map(([label, status]) => (
                  <div
                    key={label}
                    className="bg-muted/40 flex items-center justify-between rounded-xl border p-3.5 text-sm"
                  >
                    <span>{label}</span>
                    <span className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="bg-muted/10 border-y px-5 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 py-20 sm:py-24 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <p className="text-sm font-medium text-violet-600 dark:text-violet-400">
              Questions, answered
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
              A clearer start.
            </h2>
            <p className="text-muted-foreground mt-5 max-w-sm text-sm leading-6">
              Start with the answer you need, then explore the product when you
              are ready.
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
                  <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-muted-foreground max-w-xl pt-3 text-sm leading-6">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative isolate overflow-hidden border-b px-5 sm:px-8">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-violet-500/15" />
        <div className="mx-auto flex max-w-3xl flex-col items-center py-20 text-center sm:py-28">
          <RouteIcon className="size-8 text-violet-500" />
          <h2 className="mt-5 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">
            Ready to follow the signal?
          </h2>
          <p className="text-muted-foreground mt-5 max-w-md text-sm leading-6 sm:text-base">
            Start with one project and build from the questions your team is
            already asking.
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
