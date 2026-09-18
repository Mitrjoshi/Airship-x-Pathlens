import { AnimatedWords } from '@/components/animated-words'
import {
  ActivityIcon,
  BarChart3Icon,
  EyeIcon,
  FormInputIcon,
  GaugeIcon,
  LockKeyholeIcon,
  MousePointerClickIcon,
  RouteIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
  ZapIcon,
} from 'lucide-react'

const subheadings = [
  'understand your users.',
  'see what users actually do.',
  'find friction in your product.',
  'discover what drives conversions.',
  'turn behavior into insights.',
]

const reasons = [
  {
    number: '01',
    title: 'One Script',
    description:
      'Install once. Start capturing meaningful signals automatically.',
    signals: [
      { icon: ZapIcon, text: 'one-install' },
      { icon: ActivityIcon, text: 'auto-capture' },
      { icon: SparklesIcon, text: 'ready-instantly' },
      { icon: GaugeIcon, text: 'lightweight' },
      { icon: BarChart3Icon, text: 'live-data' },
      { icon: RouteIcon, text: 'track-journeys' },
    ],
  },
  {
    number: '02',
    title: 'Every Signal',
    description:
      'Clicks, scrolls, forms, sessions, errors, performance and more.',
    signals: [
      { icon: MousePointerClickIcon, text: 'clicks' },
      { icon: ScrollTextIcon, text: 'scrolls' },
      { icon: FormInputIcon, text: 'forms' },
      { icon: GaugeIcon, text: 'performance' },
      { icon: ActivityIcon, text: 'events' },
      { icon: EyeIcon, text: 'sessions' },
    ],
  },
  {
    number: '03',
    title: 'See Why',
    description: 'Go beyond numbers and understand what visitors actually did.',
    signals: [
      { icon: EyeIcon, text: 'replay' },
      { icon: RouteIcon, text: 'journey' },
      { icon: ActivityIcon, text: 'events' },
      { icon: MousePointerClickIcon, text: 'interactions' },
      { icon: ScrollTextIcon, text: 'scroll-depth' },
      { icon: BarChart3Icon, text: 'behavior' },
    ],
  },
  {
    number: '04',
    title: 'Find Friction',
    description: 'Spot drop-offs, broken flows and unexpected behavior faster.',
    signals: [
      { icon: ZapIcon, text: 'rage-clicks' },
      { icon: MousePointerClickIcon, text: 'dead-clicks' },
      { icon: RouteIcon, text: 'drop-offs' },
      { icon: ActivityIcon, text: 'errors' },
      { icon: FormInputIcon, text: 'form-issues' },
      { icon: GaugeIcon, text: 'slow-pages' },
    ],
  },
  {
    number: '05',
    title: 'Stay Private',
    description: "Understand users without collecting what you don't need.",
    signals: [
      { icon: ShieldCheckIcon, text: 'private' },
      { icon: LockKeyholeIcon, text: 'masked' },
      { icon: EyeIcon, text: 'anonymous' },
      { icon: ShieldCheckIcon, text: 'safe-replay' },
      { icon: LockKeyholeIcon, text: 'blocked-fields' },
      { icon: SparklesIcon, text: 'privacy-first' },
    ],
  },
  {
    number: '06',
    title: 'Act Faster',
    description: 'Turn raw behavior into insights your team can actually use.',
    signals: [
      { icon: BarChart3Icon, text: 'insights' },
      { icon: SparklesIcon, text: 'patterns' },
      { icon: ZapIcon, text: 'take-action' },
      { icon: GaugeIcon, text: 'monitor' },
      { icon: RouteIcon, text: 'optimize-flows' },
      { icon: TargetIcon, text: 'conversions' },
    ],
  },
]

export const WhyChooseUs = () => {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const grid = e.currentTarget
    const gridRect = grid.getBoundingClientRect()

    // Global cursor position for the background/border glow
    grid.style.setProperty('--mouse-x', `${e.clientX - gridRect.left}px`)
    grid.style.setProperty('--mouse-y', `${e.clientY - gridRect.top}px`)

    // Update cursor position relative to every card.
    // This allows the blob to reveal neighboring cards too.
    grid.querySelectorAll<HTMLElement>('[data-reason-card]').forEach((card) => {
      const rect = card.getBoundingClientRect()

      card.style.setProperty('--card-x', `${e.clientX - rect.left}px`)
      card.style.setProperty('--card-y', `${e.clientY - rect.top}px`)
    })
  }

  return (
    <div className="space-y-20">
      <div className="space-y-2 px-8 pt-20">
        <p className="text-center text-4xl font-medium">
          Why Choose <span className="text-primary">Pathlens</span>
        </p>

        <p className="text-muted-foreground mx-auto flex w-fit items-center gap-1 text-center">
          Everything you need to{' '}
          <AnimatedWords
            className="text-muted-foreground"
            words={subheadings}
          />
        </p>
      </div>

      <div
        onMouseMove={handleMouseMove}
        className="group/grid relative grid grid-cols-3 overflow-hidden border-t"
      >
        {/* Soft cursor blob */}
        <div className="bg-primary/10 pointer-events-none absolute top-(--mouse-y) left-(--mouse-x) z-0 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover/grid:opacity-100" />

        {/* Border proximity highlight — unchanged */}
        <div
          className="pointer-events-none absolute inset-0 z-30 opacity-0 transition-opacity duration-300 group-hover/grid:opacity-100"
          style={{
            background: `
              radial-gradient(
                180px circle at var(--mouse-x) var(--mouse-y),
                var(--primary),
                transparent 70%
              )
            `,
            maskImage: `
              linear-gradient(
                to right,
                transparent calc(33.333% - 1px),
                black calc(33.333% - 1px),
                black calc(33.333% + 1px),
                transparent calc(33.333% + 1px),
                transparent calc(66.666% - 1px),
                black calc(66.666% - 1px),
                black calc(66.666% + 1px),
                transparent calc(66.666% + 1px)
              ),
              linear-gradient(
                to bottom,
                transparent calc(50% - 1px),
                black calc(50% - 1px),
                black calc(50% + 1px),
                transparent calc(50% + 1px)
              )
            `,
            maskComposite: 'add',
          }}
        />

        {reasons.map((reason, index) => (
          <div
            key={reason.number}
            data-reason-card
            className={`relative min-h-64 overflow-hidden ${index % 3 !== 2 ? 'border-r' : ''} ${index < 3 ? 'border-b' : ''} `}
          >
            {/* Normal card content */}
            <div className="relative z-10 flex h-full min-h-64 flex-col justify-between space-y-6 p-5">
              <span className="text-primary text-xs">{reason.number}</span>

              <div>
                <h3 className="text-lg font-medium">{reason.title}</h3>

                <p className="text-muted-foreground mt-2 max-w-xs text-sm">
                  {reason.description}
                </p>
              </div>
            </div>

            {/*
              Decorative content.
              Exists across the card but is ONLY visible inside the cursor blob.
              Redesigned: a monospace signal readout grid instead of scattered badges.
            */}
            <div
              className="pointer-events-none absolute inset-0 z-20 opacity-0 transition-opacity duration-200 group-hover/grid:opacity-100"
              style={{
                WebkitMaskImage: `
                  radial-gradient(
                    150px circle at var(--card-x) var(--card-y),
                    black 0%,
                    black 35%,
                    transparent 100%
                  )
                `,
                maskImage: `
                  radial-gradient(
                    150px circle at var(--card-x) var(--card-y),
                    black 0%,
                    black 35%,
                    transparent 100%
                  )
                `,
              }}
            >
              {/* Tint + fine dot texture, confined to the same mask */}
              <div className="bg-primary/5 absolute inset-0" />
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage:
                    'radial-gradient(var(--primary) 1px, transparent 1px)',
                  backgroundSize: '14px 14px',
                }}
              />

              {/* Scanline sweep, loops only while a card is being hovered */}
              <div className="via-primary/40 absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-0 group-hover/card:opacity-100" />

              {/* Signal readout grid — fixed 2-column layout, not scattered */}
              <div className="absolute inset-0 mb-12 grid grid-cols-2 content-center gap-x-3 gap-y-2 p-6">
                {reason.signals.map((signal, i) => {
                  const Icon = signal.icon

                  return (
                    <div
                      key={i}
                      className="text-primary flex items-center gap-1.5"
                    >
                      <Icon size={11} className="shrink-0 opacity-70" />
                      <span className="text-primary/90 truncate font-mono text-[10.5px] tracking-tight">
                        {signal.text}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type AnimatedDashedPathProps = {
  className?: string
  strokeWidth?: number
}

export const AnimatedDashedLine = ({
  className,
  strokeWidth = 1.5,
}: AnimatedDashedPathProps) => {
  return (
    <svg
      viewBox="0 0 600 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M0 10H600"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray="8 8"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-16"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  )
}
