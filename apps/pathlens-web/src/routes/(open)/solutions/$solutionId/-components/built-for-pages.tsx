import { useEffect, useState } from 'react'
import {
  ArrowUpRightIcon,
  Clock3Icon,
  FileTextIcon,
  LayersIcon,
  TrendingUpIcon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

type Page = {
  id: string
  path: string
  views: number
  engagement: number
}

const initialPages: Page[] = [
  {
    id: 'home',
    path: '/home',
    views: 12480,
    engagement: 84,
  },
  {
    id: 'pricing',
    path: '/pricing',
    views: 6842,
    engagement: 72,
  },
  {
    id: 'features',
    path: '/features',
    views: 3256,
    engagement: 61,
  },
  {
    id: 'blog',
    path: '/blog/analytics',
    views: 2314,
    engagement: 48,
  },
]

const formatNumber = (value: number) => {
  return value.toLocaleString('en-US')
}

const AnimatedNumber = ({
  value,
  className,
}: {
  value: number
  className?: string
}) => {
  const [displayValue, setDisplayValue] = useState(value)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) {
      return
    }

    let frame = 0
    const totalFrames = 18
    const startValue = displayValue
    const difference = value - startValue

    if (difference === 0) return

    let frameId = 0

    const animate = () => {
      frame += 1

      const progress = Math.min(frame / totalFrames, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      setDisplayValue(Math.round(startValue + difference * eased))

      if (progress < 1) {
        frameId = requestAnimationFrame(animate)
      }
    }

    frameId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(frameId)
  }, [value, reducedMotion])

  return (
    <motion.span
      key={value}
      initial={
        reducedMotion
          ? false
          : {
              scale: 1.16,
            }
      }
      animate={{
        scale: 1,
      }}
      transition={{
        type: 'spring',
        stiffness: 350,
        damping: 18,
      }}
      className={className}
    >
      {formatNumber(reducedMotion ? value : displayValue)}
    </motion.span>
  )
}

export const BuiltForPages = () => {
  const reducedMotion = useReducedMotion()

  const [pages, setPages] = useState<Page[]>(initialPages)
  const [activePage, setActivePage] = useState<string | null>(null)
  const [activityCount, setActivityCount] = useState(0)

  const totalViews = pages.reduce((total, page) => total + page.views, 0)

  const sortedPages = [...pages].sort((a, b) => b.views - a.views)

  const maxViews = Math.max(...pages.map((page) => page.views))

  useEffect(() => {
    if (reducedMotion) return

    const interval = window.setInterval(() => {
      setActivityCount((count) => count + 1)
    }, 2300)

    return () => window.clearInterval(interval)
  }, [reducedMotion])

  useEffect(() => {
    if (reducedMotion || activityCount === 0) return

    const pageId = initialPages[activityCount % initialPages.length]!.id

    setActivePage(pageId)

    setPages((currentPages) =>
      currentPages.map((page) => {
        if (page.id !== pageId) return page

        return {
          ...page,
          views: page.views + Math.ceil(Math.random() * 8),
        }
      })
    )

    const timeout = window.setTimeout(() => {
      setActivePage(null)
    }, 1150)

    return () => window.clearTimeout(timeout)
  }, [activityCount, reducedMotion])

  return (
    <div className="group h-full">
      <div className="flex h-full flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="p-5">
          <p className="text-muted-foreground font-medium">
            <LayersIcon className="mr-2 inline-block" size={18} />
            Pages & Content
          </p>

          <p className="text-muted-foreground mt-2 text-sm">
            Discover top pages, track engagement, and see what{' '}
            <span className="text-foreground">people love most</span>.
          </p>
        </div>

        {/* Analytics preview */}
        <div className="bg-card/20 relative aspect-square w-full overflow-hidden border-t-2 border-dashed">
          {/* Ambient glow */}
          <div className="bg-primary/5 pointer-events-none absolute inset-x-10 bottom-8 h-36 rounded-full blur-3xl" />

          <motion.div
            initial={{
              opacity: 0,
              y: 16,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.2,
            }}
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-0 flex flex-col gap-3 p-4 sm:p-5"
          >
            {/* Dashboard heading */}
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-foreground text-xs font-semibold">
                  Page performance
                </p>
                <p className="text-muted-foreground mt-0.5 text-[10px]">
                  Your most popular content
                </p>
              </div>

              <div className="bg-background/90 flex items-center gap-1.5 rounded-full border px-2.5 py-1 shadow-sm">
                <span className="bg-primary size-1.5 rounded-full" />
                <span className="text-muted-foreground text-[10px] font-medium">
                  Last 7 days
                </span>
              </div>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-2 gap-2">
              <motion.div
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                transition={{
                  delay: 0.1,
                  duration: 0.5,
                }}
                className="bg-background/90 border-2 border-dashed p-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[10px]">
                    Page views
                  </span>

                  <FileTextIcon className="text-muted-foreground size-3.5" />
                </div>

                <div className="mt-2 flex items-end justify-between gap-1">
                  <AnimatedNumber
                    value={totalViews}
                    className="text-foreground text-lg font-semibold tracking-tight tabular-nums sm:text-xl"
                  />

                  <span className="flex items-center gap-0.5 text-[9px] font-medium text-emerald-500">
                    <TrendingUpIcon className="size-3" />
                    12.8%
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                whileInView={{
                  opacity: 1,
                  y: 0,
                }}
                viewport={{
                  once: true,
                }}
                transition={{
                  delay: 0.2,
                  duration: 0.5,
                }}
                className="bg-background/90 border-2 border-dashed p-3 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[10px]">
                    Avg. engagement
                  </span>

                  <Clock3Icon className="text-muted-foreground size-3.5" />
                </div>

                <div className="mt-2 flex items-end justify-between gap-1">
                  <span className="text-foreground text-lg font-semibold tracking-tight sm:text-xl">
                    2m 34s
                  </span>

                  <span className="flex items-center gap-0.5 text-[9px] font-medium text-emerald-500">
                    <TrendingUpIcon className="size-3" />
                    8.2%
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Top pages */}
            <div className="bg-background/90 relative flex-1 overflow-auto border-2 border-dashed shadow-sm">
              <div className="flex items-center justify-between border-b-2 border-dashed px-3 py-2.5">
                <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  Top pages
                </p>

                <p className="text-muted-foreground text-[10px] font-medium">
                  Views
                </p>
              </div>

              <motion.div layout className="relative">
                <AnimatePresence initial={false}>
                  {sortedPages.map((page, index) => {
                    const isActive = activePage === page.id

                    const width = (page.views / maxViews) * 100

                    return (
                      <motion.div
                        layout
                        key={page.id}
                        initial={{
                          opacity: 0,
                          x: -12,
                        }}
                        animate={{
                          opacity: 1,
                          x: 0,
                        }}
                        exit={{
                          opacity: 0,
                          x: 12,
                        }}
                        transition={{
                          layout: {
                            type: 'spring',
                            stiffness: 250,
                            damping: 28,
                          },
                          opacity: {
                            duration: 0.3,
                            delay: index * 0.08,
                          },
                          x: {
                            duration: 0.4,
                            delay: index * 0.08,
                          },
                        }}
                        className="relative border-b border-dashed px-3 py-2.5 last:border-0"
                      >
                        {/* Active row background */}
                        <AnimatePresence>
                          {isActive && !reducedMotion && (
                            <motion.div
                              initial={{
                                opacity: 0,
                              }}
                              animate={{
                                opacity: 1,
                              }}
                              exit={{
                                opacity: 0,
                              }}
                              transition={{
                                duration: 0.25,
                              }}
                              className="bg-primary/5 pointer-events-none absolute inset-0"
                            />
                          )}
                        </AnimatePresence>

                        <div className="relative z-10">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="text-muted-foreground w-3 text-[10px] font-medium">
                                {index + 1}
                              </span>

                              <FileTextIcon className="text-muted-foreground size-3 shrink-0" />

                              <span className="text-foreground truncate text-[11px] font-medium">
                                {page.path}
                              </span>
                            </div>

                            <div className="flex shrink-0 items-center gap-1.5">
                              <AnimatePresence>
                                {isActive && !reducedMotion && (
                                  <motion.span
                                    initial={{
                                      opacity: 0,
                                      y: 5,
                                      scale: 0.7,
                                    }}
                                    animate={{
                                      opacity: 1,
                                      y: 0,
                                      scale: 1,
                                    }}
                                    exit={{
                                      opacity: 0,
                                      y: -7,
                                    }}
                                    transition={{
                                      duration: 0.25,
                                    }}
                                    className="text-primary text-[9px] font-semibold"
                                  >
                                    +views
                                  </motion.span>
                                )}
                              </AnimatePresence>

                              <AnimatedNumber
                                value={page.views}
                                className="text-foreground inline-block text-[11px] font-semibold tabular-nums"
                              />
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="bg-muted/70 mt-2 ml-5 h-1.5 overflow-hidden rounded-full">
                            <motion.div
                              initial={{
                                width: 0,
                              }}
                              whileInView={{
                                width: `${width}%`,
                              }}
                              viewport={{
                                once: true,
                              }}
                              transition={{
                                duration: 1,
                                delay: 0.25 + index * 0.12,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              className="bg-primary relative h-full rounded-full"
                            >
                              {isActive && !reducedMotion && (
                                <motion.div
                                  initial={{
                                    opacity: 0,
                                    x: '-100%',
                                  }}
                                  animate={{
                                    opacity: [0, 0.6, 0],
                                    x: ['-100%', '100%'],
                                  }}
                                  transition={{
                                    duration: 0.8,
                                  }}
                                  className="absolute inset-0 bg-white/40"
                                />
                              )}
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            </div>

            {/* Bottom activity */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <motion.span
                  animate={
                    reducedMotion
                      ? undefined
                      : {
                          scale: [1, 1.5, 1],
                          opacity: [0.5, 1, 0.5],
                        }
                  }
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="bg-primary size-1.5 rounded-full"
                />

                <span className="text-muted-foreground text-[10px]">
                  Tracking page activity
                </span>
              </div>

              <div className="flex items-center gap-1 text-[10px] font-medium text-emerald-500">
                <ArrowUpRightIcon className="size-3" />
                Growing
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
