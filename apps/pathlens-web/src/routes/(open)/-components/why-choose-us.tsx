import { AnimatedWords } from '@/components/animated-words'

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
  },
  {
    number: '02',
    title: 'Every Signal',
    description:
      'Clicks, scrolls, forms, sessions, errors, performance and more.',
  },
  {
    number: '03',
    title: 'See Why',
    description: 'Go beyond numbers and understand what visitors actually did.',
  },
  {
    number: '04',
    title: 'Find Friction',
    description: 'Spot drop-offs, broken flows and unexpected behavior faster.',
  },
  {
    number: '05',
    title: 'Stay Private',
    description: "Understand users without collecting what you don't need.",
  },
  {
    number: '06',
    title: 'Act Faster',
    description: 'Turn raw behavior into insights your team can actually use.',
  },
]

export const WhyChooseUs = () => {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()

    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)

    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
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
        className="group/grid relative grid grid-cols-6 divide-x overflow-hidden border"
      >
        {/* Global cursor blob */}
        <div className="bg-primary/10 pointer-events-none absolute top-(--mouse-y) left-(--mouse-x) z-0 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-3xl transition-opacity duration-300 group-hover/grid:opacity-100" />

        {reasons.map((reason) => (
          <div
            key={reason.number}
            className="relative z-10 flex aspect-square w-full flex-col justify-between p-5"
          >
            <span className="text-muted-foreground text-xs">
              {reason.number}
            </span>

            <div>
              <h3 className="text-lg font-medium">{reason.title}</h3>

              <p className="text-muted-foreground mt-2 text-sm">
                {reason.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type AnimatedDashedPathProps = {
  className?: string
}

export const AnimatedDashedLine = ({ className }: AnimatedDashedPathProps) => {
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
        strokeWidth="1.5"
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
