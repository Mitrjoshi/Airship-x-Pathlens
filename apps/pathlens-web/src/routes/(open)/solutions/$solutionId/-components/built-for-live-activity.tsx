import { motion } from 'motion/react'
import { MousePointer2Icon, RadioIcon, UsersIcon } from 'lucide-react'

const activePages = [
  {
    page: '/home',
    visitors: 12,
  },
  {
    page: '/pricing',
    visitors: 7,
  },
  {
    page: '/blog/analytics',
    visitors: 5,
  },
]

const cursors = [
  {
    label: 'v_8f2a',
    className: 'text-primary',
    start: {
      left: '42%',
      top: '30%',
    },
    x: [0, 55, 85, 30, 0],
    y: [0, 20, 5, 50, 0],
    duration: 8,
  },
  {
    label: 'v_91be',
    className: 'text-muted-foreground',
    start: {
      left: '60%',
      top: '38%',
    },
    x: [0, -45, 10, -25, 0],
    y: [0, 35, 55, 15, 0],
    duration: 10,
  },
]

export const BuiltForLiveActivity = () => {
  return (
    <div className="group">
      <div className="flex h-full flex-col justify-between overflow-hidden">
        <div className="p-5">
          <p className="text-muted-foreground font-medium">
            <RadioIcon className="mr-2 inline-block" size={18} />
            Live Activity
          </p>

          <p className="text-muted-foreground mt-2 text-sm">
            Watch{' '}
            <span className="text-foreground font-medium">
              visitors, active pages, events, and interactions
            </span>{' '}
            as they happen.
          </p>
        </div>

        <div className="bg-card/20 relative aspect-square w-full overflow-hidden border-t-2 border-dashed">
          {/* subtle glow */}
          <div className="bg-primary/5 pointer-events-none absolute inset-x-10 bottom-10 h-32 rounded-full blur-3xl" />

          {/* live status */}
          <div className="absolute top-5 left-5 z-10 flex items-center gap-2">
            <div className="bg-background/90 flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm backdrop-blur">
              <span className="relative flex size-2">
                <span className="bg-primary absolute inline-flex size-full animate-ping rounded-full opacity-40" />
                <span className="bg-primary relative inline-flex size-2 rounded-full" />
              </span>

              <span className="text-foreground text-xs font-medium">Live</span>
            </div>

            <motion.div
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="text-muted-foreground flex items-center gap-1.5 text-[11px]"
            >
              <UsersIcon className="text-primary size-3.5" />

              <span>
                <span className="text-foreground font-medium">24</span> online
              </span>
            </motion.div>
          </div>

          {/* cursor activity */}
          {cursors.map((cursor) => (
            <motion.div
              key={cursor.label}
              className={`absolute z-20 ${cursor.className}`}
              style={cursor.start}
              animate={{
                x: cursor.x,
                y: cursor.y,
              }}
              transition={{
                duration: cursor.duration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <div className="relative">
                <MousePointer2Icon size={18} className="fill-current" />

                <motion.div
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: [2, 0, 0, -2],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatDelay: 2.5,
                  }}
                  className="bg-foreground text-background absolute top-5 left-4 rounded px-1.5 py-0.5 text-[8px] font-medium whitespace-nowrap shadow-sm"
                >
                  {cursor.label}
                </motion.div>
              </div>
            </motion.div>
          ))}

          {/* click pulse */}
          <motion.div
            className="border-primary/40 absolute top-[39%] left-[49%] size-4 rounded-full border"
            animate={{
              scale: [0.5, 2],
              opacity: [0.7, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              repeatDelay: 3.2,
            }}
          />

          {/* active pages */}
          <div className="bg-background/90 absolute right-5 bottom-5 left-5 z-10 overflow-hidden border-2 border-dashed shadow-sm backdrop-blur">
            <div className="border-b-2 border-dashed px-3 py-2">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Active pages
                </p>

                <motion.span
                  animate={{
                    opacity: [0.4, 1, 0.4],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                  className="text-primary text-[10px] font-medium"
                >
                  Live
                </motion.span>
              </div>
            </div>

            <div>
              {activePages.map((item, index) => (
                <motion.div
                  key={item.page}
                  initial={{
                    opacity: 0,
                    x: -8,
                  }}
                  whileInView={{
                    opacity: 1,
                    x: 0,
                  }}
                  viewport={{ once: true }}
                  transition={{
                    delay: index * 0.1,
                  }}
                  className="flex items-center justify-between border-b-2 border-dashed px-3 py-2.5 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <motion.span
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.4, 1, 0.4],
                      }}
                      transition={{
                        duration: 2,
                        delay: index * 0.4,
                        repeat: Infinity,
                      }}
                      className="bg-primary size-1.5 rounded-full"
                    />

                    <span className="text-foreground text-xs font-medium">
                      {item.page}
                    </span>
                  </div>

                  <span className="text-muted-foreground text-[11px]">
                    {item.visitors}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* cursor activity */}
          {cursors.map((cursor) => (
            <motion.div
              key={cursor.label}
              className={`absolute z-20 ${cursor.className}`}
              style={cursor.start}
              animate={{
                x: cursor.x,
                y: cursor.y,
              }}
              transition={{
                duration: cursor.duration,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              <div className="relative">
                <MousePointer2Icon size={20} className="fill-current" />

                <motion.div
                  animate={{
                    opacity: [0, 1, 1, 0],
                    y: [3, 0, 0, -3],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    repeatDelay: 2,
                  }}
                  className="bg-foreground text-background absolute top-5 left-4 rounded-md px-1.5 py-0.5 text-[9px] font-medium whitespace-nowrap shadow-sm"
                >
                  {cursor.label}
                </motion.div>
              </div>
            </motion.div>
          ))}

          {/* click indicator */}
          <motion.div
            className="border-primary/40 absolute top-[44%] left-[38%] size-5 rounded-full border"
            animate={{
              scale: [0, 1.8],
              opacity: [0.8, 0],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              repeatDelay: 3.5,
            }}
          />

          {/* floating event */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
              y: 5,
            }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.95, 1, 1, 0.98],
              y: [5, 0, 0, -5],
            }}
            transition={{
              duration: 5,
              times: [0, 0.15, 0.75, 1],
              repeat: Infinity,
              repeatDelay: 3,
            }}
            className="bg-background absolute top-[42%] left-[18%] z-10 rounded-lg border px-2.5 py-1.5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="bg-primary size-1.5 rounded-full" />

              <span className="text-muted-foreground text-[10px]">
                Viewed{' '}
                <span className="text-foreground font-medium">/pricing</span>
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
