import { UsersIcon } from 'lucide-react'
import { AnimatePresence } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'

type Visitor = {
  visitor: string
  country: string
  device: string
  sessions: number
}

type VisitorRow = Visitor & {
  rowKey: string
}

const initialVisitors: Visitor[] = [
  {
    visitor: 'v_8f2a91',
    country: '🇮🇳 India',
    device: 'Desktop',
    sessions: 8,
  },
  {
    visitor: 'v_4c7d20',
    country: '🇺🇸 United States',
    device: 'Mobile',
    sessions: 3,
  },
  {
    visitor: 'v_91be43',
    country: '🇬🇧 United Kingdom',
    device: 'Desktop',
    sessions: 12,
  },
  {
    visitor: 'v_2d6f88',
    country: '🇸🇬 Singapore',
    device: 'Mobile',
    sessions: 5,
  },
  {
    visitor: 'v_75ac11',
    country: '🇩🇪 Germany',
    device: 'Tablet',
    sessions: 2,
  },
  {
    visitor: 'v_b320de',
    country: '🇦🇺 Australia',
    device: 'Desktop',
    sessions: 7,
  },
]

const incomingVisitors: Visitor[] = [
  {
    visitor: 'v_a81c42',
    country: '🇯🇵 Japan',
    device: 'Mobile',
    sessions: 1,
  },
  {
    visitor: 'v_f2d913',
    country: '🇫🇷 France',
    device: 'Desktop',
    sessions: 4,
  },
  {
    visitor: 'v_6bc184',
    country: '🇨🇦 Canada',
    device: 'Tablet',
    sessions: 2,
  },
  {
    visitor: 'v_3fa720',
    country: '🇦🇪 UAE',
    device: 'Mobile',
    sessions: 6,
  },
]

const rowSpring = {
  type: 'spring' as const,
  stiffness: 320,
  damping: 32,
  mass: 0.8,
}

export const BuiltForVisitor = () => {
  const [visitors, setVisitors] = useState<VisitorRow[]>(() =>
    initialVisitors.map((visitor) => ({
      ...visitor,
      rowKey: `initial-${visitor.visitor}`,
    }))
  )

  const [highlightedRow, setHighlightedRow] = useState<string | null>(null)

  const visitorIndex = useRef(0)
  const rowSequence = useRef(0)

  useEffect(() => {
    const interval = window.setInterval(() => {
      const newVisitor = incomingVisitors[visitorIndex.current]

      if (!newVisitor) return

      rowSequence.current += 1

      const newRow: VisitorRow = {
        ...newVisitor,
        rowKey: `${newVisitor.visitor}-${rowSequence.current}`,
      }

      setVisitors((currentVisitors) => {
        /*
         * Remove the same visitor if it already exists.
         * This prevents duplicate visitors when incomingVisitors loops.
         */
        const visitorsWithoutDuplicate = currentVisitors.filter(
          (visitor) => visitor.visitor !== newVisitor.visitor
        )

        return [newRow, ...visitorsWithoutDuplicate].slice(
          0,
          initialVisitors.length
        )
      })

      setHighlightedRow(newRow.rowKey)

      visitorIndex.current =
        (visitorIndex.current + 1) % incomingVisitors.length
    }, 3500)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  return (
    <div className="grid grid-cols-2 gap-4 p-5">
      <div className="flex flex-col justify-between gap-2 space-y-4">
        <div>
          <p className="text-muted-foreground font-medium">
            <UsersIcon className="mr-2 inline-block" size={18} />
            Visitors
          </p>

          <p className="text-muted-foreground mt-2 text-sm">
            See unique visitors, sessions, returning users, devices, browsers,
            countries, and more from{' '}
            <span className="text-foreground font-medium">
              one clean overview
            </span>
            .
          </p>
        </div>

        <ul className="list-disc pl-5 text-sm">
          <li>Unique visitors & sessions</li>
          <li>New vs returning users</li>
          <li>Device & browser insights</li>
        </ul>
      </div>

      <div
        className="relative h-full overflow-hidden border border-dashed"
        style={{
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 10%, transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, black 0%, black 10%, transparent 100%)',
        }}
      >
        <div className="bg-sidebar text-muted-foreground relative z-10 grid grid-cols-4 border-b p-2 text-xs">
          <p>Visitor</p>
          <p>Country</p>
          <p>Device</p>
          <p className="text-right">Sessions</p>
        </div>

        <div className="relative">
          <AnimatePresence initial={false} mode="popLayout">
            {visitors.map((visitor) => {
              const isNew = highlightedRow === visitor.rowKey

              return (
                <motion.div
                  layout="position"
                  key={visitor.rowKey}
                  initial={{
                    opacity: 0,
                    y: -16,
                    scale: 0.985,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                  }}
                  exit={{
                    opacity: 0,
                    y: 12,
                    scale: 0.985,
                  }}
                  transition={{
                    layout: rowSpring,
                    y: rowSpring,
                    scale: {
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    },
                    opacity: {
                      duration: 0.25,
                      ease: 'easeOut',
                    },
                  }}
                  className="text-muted-foreground relative grid h-11 grid-cols-4 items-center overflow-hidden border-b px-2 text-xs will-change-transform"
                >
                  {/* New visitor background highlight */}
                  <motion.div
                    aria-hidden="true"
                    className="bg-primary pointer-events-none absolute inset-0"
                    initial={{ opacity: 0 }}
                    animate={
                      isNew
                        ? {
                            opacity: [0, 0.14, 0.14, 0],
                          }
                        : {
                            opacity: 0,
                          }
                    }
                    transition={{
                      duration: 1.6,
                      times: [0, 0.12, 0.48, 1],
                      ease: 'easeInOut',
                    }}
                  />

                  {/* New visitor side indicator */}
                  <motion.div
                    aria-hidden="true"
                    className="bg-primary pointer-events-none absolute inset-y-0 left-0 w-0.5 origin-center"
                    initial={{
                      opacity: 0,
                      scaleY: 0,
                    }}
                    animate={
                      isNew
                        ? {
                            opacity: [0, 1, 1, 0],
                            scaleY: [0, 1, 1, 0],
                          }
                        : {
                            opacity: 0,
                            scaleY: 0,
                          }
                    }
                    transition={{
                      duration: 1.6,
                      times: [0, 0.12, 0.48, 1],
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />

                  <p className="text-foreground relative z-10 truncate font-mono">
                    {visitor.visitor}
                  </p>

                  <p className="relative z-10 truncate">{visitor.country}</p>

                  <p className="relative z-10 truncate">{visitor.device}</p>

                  <p className="text-foreground relative z-10 text-right font-medium tabular-nums">
                    {visitor.sessions}
                  </p>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
