import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import {
  Globe2Icon,
  MousePointerClickIcon,
  SearchIcon,
  Share2Icon,
  TrafficCone,
} from 'lucide-react'

type TrafficSourceItem = {
  label: string
  visits: number
  change: number
  icon: LucideIcon
}

const initialTrafficSources: TrafficSourceItem[] = [
  {
    label: 'Organic Search',
    visits: 8400,
    change: 12.4,
    icon: SearchIcon,
  },
  {
    label: 'Direct',
    visits: 5600,
    change: 8.2,
    icon: MousePointerClickIcon,
  },
  {
    label: 'Social',
    visits: 3600,
    change: 6.8,
    icon: Share2Icon,
  },
  {
    label: 'Referral',
    visits: 2400,
    change: 4.6,
    icon: Globe2Icon,
  },
]

type AnimatedNumberProps = {
  value: number
  formatter: (value: number) => string
  className?: string
}

const springConfig = {
  stiffness: 90,
  damping: 22,
  mass: 0.8,
}

const AnimatedNumber = ({
  value,
  formatter,
  className,
}: AnimatedNumberProps) => {
  const motionValue = useMotionValue(value)
  const springValue = useSpring(motionValue, springConfig)

  const displayValue = useTransform(springValue, (latestValue) =>
    formatter(latestValue)
  )

  useEffect(() => {
    motionValue.set(value)
  }, [motionValue, value])

  return <motion.span className={className}>{displayValue}</motion.span>
}

const formatPercentage = (value: number) => {
  const roundedValue = Number(value.toFixed(1))

  return `${roundedValue}%`
}

const formatVisits = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k visits`
  }

  return `${Math.round(value)} visits`
}

const formatChange = (value: number) => {
  const sign = value >= 0 ? '+' : ''

  return `${sign}${value.toFixed(1)}%`
}

export const BuiltForTrafficSource = () => {
  const [trafficSources, setTrafficSources] = useState(initialTrafficSources)

  const lastUpdatedIndex = useRef<number | null>(null)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    const updateRandomSource = () => {
      setTrafficSources((currentSources) => {
        if (currentSources.length === 0) return currentSources

        let randomIndex = Math.floor(Math.random() * currentSources.length)

        // Prevent the same card from updating twice consecutively
        if (currentSources.length > 1) {
          while (randomIndex === lastUpdatedIndex.current) {
            randomIndex = Math.floor(Math.random() * currentSources.length)
          }
        }

        lastUpdatedIndex.current = randomIndex

        return currentSources.map((source, index) => {
          if (index !== randomIndex) {
            return source
          }

          // Randomly increase or decrease between 1.2% and 5%
          const direction = Math.random() > 0.5 ? 1 : -1
          const movementAmount = 0.012 + Math.random() * 0.038
          const movement = direction * movementAmount

          const nextVisits = Math.max(
            500,
            Math.round(source.visits * (1 + movement))
          )

          const actualChange =
            ((nextVisits - source.visits) / source.visits) * 100

          return {
            ...source,
            visits: nextVisits,
            change: actualChange,
          }
        })
      })

      // Update the next random card after 1.8–3.8 seconds
      const nextDelay = 1800 + Math.random() * 2000

      timeout = setTimeout(updateRandomSource, nextDelay)
    }

    // Small initial delay before starting
    timeout = setTimeout(updateRandomSource, 1400)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  const totalVisits = trafficSources.reduce(
    (total, source) => total + source.visits,
    0
  )

  return (
    <div className="group">
      <div className="flex h-full flex-col justify-between gap-8 overflow-hidden p-5">
        <div>
          <p className="text-muted-foreground font-medium">
            <TrafficCone className="mr-2 inline-block" size={18} />
            Traffic Source
          </p>

          <p className="text-muted-foreground mt-2 text-sm">
            Understand which channels, campaigns, referrals, and search sources
            are actually driving people to your website.
          </p>
        </div>

        <div className="h-full overflow-hidden">
          <div className="grid h-full scale-150 grid-cols-2 gap-2 transition-transform duration-300 group-hover:scale-100">
            {trafficSources.map((source) => {
              const Icon = source.icon

              const percentage =
                totalVisits > 0 ? (source.visits / totalVisits) * 100 : 0

              const isIncreasing = source.change >= 0

              return (
                <div
                  key={source.label}
                  className="bg-card/40 group/card relative flex min-h-28 flex-col justify-between border-2 border-dashed p-3 backdrop-blur-sm transition-all duration-300"
                >
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="bg-primary/10 text-primary border-primary/10 flex size-7 items-center justify-center rounded-md border">
                      <Icon className="size-3.5" />
                    </div>

                    <div className="text-right">
                      <p className="text-muted-foreground text-[8px] tracking-wide uppercase">
                        Visits
                      </p>

                      <AnimatedNumber
                        value={source.visits}
                        formatter={formatVisits}
                        className="text-foreground mt-0.5 block text-[10px] font-medium tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="relative z-10 mt-4">
                    <p className="text-muted-foreground text-[10px]">
                      {source.label}
                    </p>

                    <div className="mt-0.5 flex items-end justify-between">
                      <AnimatedNumber
                        value={percentage}
                        formatter={formatPercentage}
                        className="text-foreground text-xl font-medium tracking-tight tabular-nums"
                      />

                      <motion.div
                        key={`${source.label}-${source.visits}`}
                        initial={{
                          opacity: 0,
                          y: 3,
                          scale: 0.96,
                        }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                        }}
                        transition={{
                          duration: 0.3,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className={
                          isIncreasing
                            ? 'bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[8px] font-medium tabular-nums'
                            : 'bg-destructive/10 text-destructive rounded-full px-1.5 py-0.5 text-[8px] font-medium tabular-nums'
                        }
                      >
                        <AnimatedNumber
                          value={source.change}
                          formatter={formatChange}
                        />
                      </motion.div>
                    </div>

                    <div className="bg-muted mt-2 h-1 overflow-hidden rounded-full">
                      <motion.div
                        className="bg-primary h-full rounded-full"
                        initial={false}
                        animate={{
                          width: `${percentage}%`,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 75,
                          damping: 20,
                          mass: 0.8,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
