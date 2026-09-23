import { useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import type { LucideIcon } from 'lucide-react'
import {
  DownloadIcon,
  GoalIcon,
  MousePointerClickIcon,
  SendIcon,
  ShoppingBagIcon,
  UserPlusIcon,
} from 'lucide-react'

type GoalItem = {
  label: string
  completions: number
  conversionRate: number
  change: number
  icon: LucideIcon
}

const initialGoals: GoalItem[] = [
  {
    label: 'Sign Ups',
    completions: 326,
    conversionRate: 8.4,
    change: 12.4,
    icon: UserPlusIcon,
  },
  {
    label: 'Purchases',
    completions: 184,
    conversionRate: 4.7,
    change: 8.2,
    icon: ShoppingBagIcon,
  },
  {
    label: 'Form Submissions',
    completions: 248,
    conversionRate: 6.3,
    change: 6.8,
    icon: SendIcon,
  },
  {
    label: 'CTA Clicks',
    completions: 584,
    conversionRate: 14.8,
    change: 4.6,
    icon: MousePointerClickIcon,
  },
  {
    label: 'Downloads',
    completions: 142,
    conversionRate: 3.6,
    change: 7.3,
    icon: DownloadIcon,
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
  return `${value.toFixed(1)}%`
}

const formatCompletions = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }

  return Math.round(value).toLocaleString()
}

const formatChange = (value: number) => {
  const sign = value >= 0 ? '+' : ''

  return `${sign}${value.toFixed(1)}%`
}

export const BuiltForGoals = () => {
  const [goals, setGoals] = useState(initialGoals)

  const lastUpdatedIndex = useRef<number | null>(null)

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    const updateRandomGoal = () => {
      setGoals((currentGoals) => {
        if (currentGoals.length === 0) return currentGoals

        let randomIndex = Math.floor(Math.random() * currentGoals.length)

        // Don't animate the same goal twice in a row
        if (currentGoals.length > 1) {
          while (randomIndex === lastUpdatedIndex.current) {
            randomIndex = Math.floor(Math.random() * currentGoals.length)
          }
        }

        lastUpdatedIndex.current = randomIndex

        return currentGoals.map((goal, index) => {
          if (index !== randomIndex) {
            return goal
          }

          const direction = Math.random() > 0.35 ? 1 : -1

          const completionMovement = direction * (0.012 + Math.random() * 0.038)

          const nextCompletions = Math.max(
            1,
            Math.round(goal.completions * (1 + completionMovement))
          )

          const actualChange =
            ((nextCompletions - goal.completions) / goal.completions) * 100

          const rateMovement = direction * (0.1 + Math.random() * 0.5)

          const nextConversionRate = Math.max(
            0.1,
            Math.min(100, goal.conversionRate + rateMovement)
          )

          return {
            ...goal,
            completions: nextCompletions,
            conversionRate: nextConversionRate,
            change: actualChange,
          }
        })
      })

      const nextDelay = 1800 + Math.random() * 2000

      timeout = setTimeout(updateRandomGoal, nextDelay)
    }

    timeout = setTimeout(updateRandomGoal, 1400)

    return () => {
      clearTimeout(timeout)
    }
  }, [])

  return (
    <div className="group">
      <div className="flex h-full flex-col justify-between overflow-hidden">
        <div className="p-5">
          <p className="text-muted-foreground font-medium">
            <GoalIcon className="mr-2 inline-block" size={18} />
            Goals & Conversions
          </p>

          <p className="text-muted-foreground mt-2 text-sm">
            Track{' '}
            <span className="text-foreground">
              sign-ups, purchases, form submissions, button clicks, downloads
            </span>{' '}
            or any important action on your website.
          </p>
        </div>

        <div className="relative w-full overflow-hidden border-t-2 border-dashed p-5">
          <div className="grid h-full grid-cols-2 gap-2">
            {goals.map((goal, index) => {
              const Icon = goal.icon
              const isIncreasing = goal.change >= 0

              return (
                <div
                  key={goal.label}
                  className={`bg-card/40 group/card relative flex min-h-28 flex-col justify-between border-2 border-dashed p-3 backdrop-blur-sm transition-all duration-300 ${
                    index === goals.length - 1 && goals.length % 2 !== 0
                      ? 'col-span-2'
                      : ''
                  }`}
                >
                  <div className="relative z-10 flex items-start justify-between">
                    <div className="bg-primary/10 text-primary border-primary/10 flex size-7 items-center justify-center rounded-md border">
                      <Icon className="size-3.5" />
                    </div>

                    <div className="text-right">
                      <p className="text-muted-foreground text-[8px] tracking-wide uppercase">
                        Completions
                      </p>

                      <AnimatedNumber
                        value={goal.completions}
                        formatter={formatCompletions}
                        className="text-foreground mt-0.5 block text-[10px] font-medium tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="relative z-10 mt-4">
                    <p className="text-muted-foreground text-[10px]">
                      {goal.label}
                    </p>

                    <div className="mt-0.5 flex items-end justify-between">
                      <AnimatedNumber
                        value={goal.conversionRate}
                        formatter={formatPercentage}
                        className="text-foreground text-xl font-medium tracking-tight tabular-nums"
                      />

                      <motion.div
                        key={`${goal.label}-${goal.completions}`}
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
                          value={goal.change}
                          formatter={formatChange}
                        />
                      </motion.div>
                    </div>

                    <div className="bg-muted mt-2 h-1 overflow-hidden rounded-full">
                      <motion.div
                        className="bg-primary h-full rounded-full"
                        initial={false}
                        animate={{
                          width: `${Math.min(goal.conversionRate * 4, 100)}%`,
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
