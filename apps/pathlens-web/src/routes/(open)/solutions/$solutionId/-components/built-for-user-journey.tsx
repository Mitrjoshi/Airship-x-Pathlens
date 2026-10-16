import { useEffect, useMemo, useState } from 'react'
import {
  Background,
  BaseEdge,
  Handle,
  Position,
  ReactFlow,
  getBezierPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import { ArrowUpRightIcon, CheckIcon, WaypointsIcon, XIcon } from 'lucide-react'

type JourneyType = 'entry' | 'page' | 'action' | 'dropoff'

type JourneyNodeData = {
  title: string
  type: JourneyType
  visitors: number
  active: boolean
  pulseId: number
}

type JourneyNode = Node<JourneyNodeData, 'journey'>

type JourneyEdgeData = {
  color: string
  duration: number
}

type JourneyEdge = Edge<JourneyEdgeData, 'visitor'>

const NODE_WIDTH = 160

const INITIAL_NODES: JourneyNode[] = [
  {
    id: 'home',
    type: 'journey',
    position: { x: 0, y: 100 },
    data: {
      title: '/home',
      type: 'entry',
      visitors: 1248,
      active: false,
      pulseId: 0,
    },
  },
  {
    id: 'pricing',
    type: 'journey',
    position: { x: 250, y: 0 },
    data: {
      title: '/pricing',
      type: 'page',
      visitors: 842,
      active: false,
      pulseId: 0,
    },
  },
  {
    id: 'features',
    type: 'journey',
    position: { x: 250, y: 200 },
    data: {
      title: '/features',
      type: 'page',
      visitors: 406,
      active: false,
      pulseId: 0,
    },
  },
  {
    id: 'signup',
    type: 'journey',
    position: { x: 500, y: 0 },
    data: {
      title: 'Sign up',
      type: 'action',
      visitors: 324,
      active: false,
      pulseId: 0,
    },
  },
  {
    id: 'exit',
    type: 'journey',
    position: { x: 500, y: 200 },
    data: {
      title: 'Drop-off',
      type: 'dropoff',
      visitors: 518,
      active: false,
      pulseId: 0,
    },
  },
]

const INITIAL_EDGES: JourneyEdge[] = [
  {
    id: 'home-pricing',
    source: 'home',
    target: 'pricing',
    type: 'visitor',
    data: {
      color: 'var(--primary)',
      duration: 1.1,
    },
  },
  {
    id: 'home-features',
    source: 'home',
    target: 'features',
    type: 'visitor',
    data: {
      color: 'var(--primary)',
      duration: 1.1,
    },
  },
  {
    id: 'pricing-signup',
    source: 'pricing',
    target: 'signup',
    type: 'visitor',
    data: {
      color: '#10b981',
      duration: 1.1,
    },
  },
  {
    id: 'pricing-exit',
    source: 'pricing',
    target: 'exit',
    type: 'visitor',
    data: {
      color: '#ef4444',
      duration: 1.1,
    },
  },
  {
    id: 'features-exit',
    source: 'features',
    target: 'exit',
    type: 'visitor',
    data: {
      color: '#ef4444',
      duration: 1.1,
    },
  },
]

const nodeStyles = {
  entry: {
    label: 'ENTRY',
    color: '#3b82f6',
    border: 'border-blue-500/50',
  },
  page: {
    label: 'PAGE VIEW',
    color: '#10b981',
    border: 'border-border',
  },
  action: {
    label: 'CONVERSION',
    color: '#10b981',
    border: 'border-emerald-500/50',
  },
  dropoff: {
    label: 'DROP-OFF',
    color: '#ef4444',
    border: 'border-red-500/50',
  },
}

function JourneyNodeCard({ data }: NodeProps<JourneyNode>) {
  const reducedMotion = useReducedMotion()
  const style = nodeStyles[data.type]

  return (
    <div className="relative" style={{ width: NODE_WIDTH }}>
      <motion.div
        animate={
          reducedMotion
            ? { scale: 1 }
            : data.active
              ? { scale: [1, 1.1, 0.97, 1] }
              : { scale: 1 }
        }
        transition={{
          duration: 0.55,
          ease: 'easeInOut',
        }}
        style={{
          transformOrigin: 'center',
        }}
        className="relative"
      >
        <motion.div
          animate={{
            opacity: data.active ? 1 : 0,
          }}
          transition={{
            duration: 0.2,
          }}
          className="pointer-events-none absolute -inset-1 border-2"
          style={{
            borderColor: style.color,
          }}
        />

        <div
          className={`bg-background relative border-2 border-dashed p-3 shadow-md ${style.border}`}
        >
          {data.type !== 'entry' && (
            <Handle
              type="target"
              position={Position.Left}
              className="!bg-muted-foreground !border-background !size-2 !rounded-none !border-2"
            />
          )}

          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <motion.span
                animate={
                  data.active && !reducedMotion
                    ? { scale: [1, 1.6, 1] }
                    : { scale: 1 }
                }
                transition={{
                  duration: 0.5,
                }}
                className="size-1.5"
                style={{
                  backgroundColor: style.color,
                }}
              />

              <span
                className="text-[9px] font-semibold tracking-wider"
                style={{
                  color: style.color,
                }}
              >
                {style.label}
              </span>
            </div>

            {data.type === 'action' && (
              <CheckIcon className="size-3.5 text-emerald-500" />
            )}

            {data.type === 'dropoff' && (
              <XIcon className="size-3.5 text-red-500" />
            )}
          </div>

          <p className="text-foreground truncate text-xs font-semibold">
            {data.title}
          </p>

          <div className="mt-3 flex items-center justify-between border-t border-dashed pt-2">
            <span className="text-muted-foreground text-[10px]">Visitors</span>

            <div className="relative flex items-center">
              <motion.span
                key={data.pulseId}
                initial={
                  reducedMotion
                    ? false
                    : {
                        opacity: 0.65,
                        scale: 1.3,
                        y: 3,
                      }
                }
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.35,
                }}
                className="text-foreground text-[11px] font-semibold tabular-nums"
              >
                {data.visitors.toLocaleString()}
              </motion.span>

              <AnimatePresence>
                {data.active && !reducedMotion && (
                  <motion.span
                    key={data.pulseId}
                    initial={{
                      opacity: 0,
                      y: 4,
                    }}
                    animate={{
                      opacity: 1,
                      y: -12,
                    }}
                    exit={{
                      opacity: 0,
                      y: -20,
                    }}
                    transition={{
                      duration: 0.5,
                    }}
                    className="text-primary absolute -top-1 -right-6 text-[10px] font-semibold"
                  >
                    +1
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          {data.type !== 'dropoff' && (
            <Handle
              type="source"
              position={Position.Right}
              className="!bg-muted-foreground !border-background !size-2 !rounded-none !border-2"
            />
          )}
        </div>
      </motion.div>
    </div>
  )
}

function VisitorEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps<JourneyEdge>) {
  const reducedMotion = useReducedMotion()

  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.4,
  })

  const color = data?.color ?? 'var(--primary)'
  const duration = data?.duration ?? 1.1

  return (
    <g>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: color,
          strokeWidth: 1.5,
          strokeOpacity: 0.3,
        }}
      />

      {!reducedMotion && (
        <>
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="square"
            strokeDasharray="12 160"
            opacity={0.6}
          >
            <animate
              attributeName="stroke-dashoffset"
              from="172"
              to="0"
              dur={`${duration}s`}
              repeatCount="indefinite"
            />
          </path>

          <circle
            r="4"
            fill={color}
            stroke="var(--background)"
            strokeWidth="1.5"
          >
            <animateMotion
              path={path}
              dur={`${duration}s`}
              repeatCount="indefinite"
            />
          </circle>
        </>
      )}
    </g>
  )
}

const nodeTypes = {
  journey: JourneyNodeCard,
}

const edgeTypes = {
  visitor: VisitorEdge,
}

const DEMO_STEPS = [
  {
    nodeId: 'home',
    delay: 0,
  },
  {
    nodeId: 'pricing',
    delay: 1200,
  },
  {
    nodeId: 'signup',
    delay: 2600,
  },
  {
    nodeId: 'home',
    delay: 4000,
  },
  {
    nodeId: 'features',
    delay: 5200,
  },
  {
    nodeId: 'exit',
    delay: 6600,
  },
]

const CYCLE_DURATION = 8500

export const BuiltForUserJourney = () => {
  const reducedMotion = useReducedMotion()

  const [nodes, setNodes] = useState<JourneyNode[]>(INITIAL_NODES)

  const [conversions, setConversions] = useState(324)
  const [dropoffs, setDropoffs] = useState(518)
  const [activeOutcome, setActiveOutcome] = useState<
    'conversion' | 'dropoff' | null
  >(null)

  const edges = useMemo(() => INITIAL_EDGES, [])

  useEffect(() => {
    if (reducedMotion) return

    const timeouts = new Set<ReturnType<typeof setTimeout>>()

    const activateNode = (nodeId: string) => {
      setNodes((current) =>
        current.map((node) => ({
          ...node,
          data: {
            ...node.data,
            active: node.id === nodeId,
            visitors:
              node.id === nodeId ? node.data.visitors + 1 : node.data.visitors,
            pulseId:
              node.id === nodeId ? node.data.pulseId + 1 : node.data.pulseId,
          },
        }))
      )

      if (nodeId === 'signup') {
        setConversions((count) => count + 1)
        setActiveOutcome('conversion')
      } else if (nodeId === 'exit') {
        setDropoffs((count) => count + 1)
        setActiveOutcome('dropoff')
      } else {
        setActiveOutcome(null)
      }
    }

    const runCycle = () => {
      DEMO_STEPS.forEach((step) => {
        const timeout = setTimeout(() => {
          activateNode(step.nodeId)
        }, step.delay)

        timeouts.add(timeout)
      })
    }

    runCycle()

    const interval = setInterval(runCycle, CYCLE_DURATION)

    return () => {
      clearInterval(interval)
      timeouts.forEach(clearTimeout)
    }
  }, [reducedMotion])

  return (
    <div className="group h-full">
      <div className="flex h-full flex-col justify-between overflow-hidden">
        {/* Heading */}
        <div className="p-5">
          <p className="text-muted-foreground font-medium">
            <WaypointsIcon className="mr-2 inline-block" size={18} />
            User Journeys
          </p>

          <p className="text-muted-foreground mt-2 text-sm">
            Understand the paths people take, where they continue, and where
            they <span className="text-foreground">leave</span>.
          </p>
        </div>

        {/* Journey preview */}
        <div className="bg-card/20 relative aspect-square w-full overflow-hidden border-t-2 border-dashed">
          {/* Background glow */}
          <div className="bg-primary/5 pointer-events-none absolute inset-x-10 bottom-10 h-32 blur-3xl" />

          <div className="absolute inset-x-4 top-4 z-10 flex items-center justify-between gap-2">
            <div className="bg-background/90 flex items-center gap-2 border px-2.5 py-1.5 shadow-sm backdrop-blur">
              <motion.span
                animate={
                  reducedMotion
                    ? undefined
                    : {
                        opacity: [0.4, 1, 0.4],
                      }
                }
                transition={{
                  duration: 2,
                  repeat: Infinity,
                }}
                className="bg-primary size-1.5"
              />

              <span className="text-foreground text-[10px] font-medium">
                Visitor journey
              </span>
            </div>

            <div className="bg-background/90 border px-2.5 py-1.5">
              <span className="text-muted-foreground line-clamp-1 text-[10px]">
                Live flow
              </span>
            </div>
          </div>

          {/* Flow graph */}
          <motion.div
            initial={
              reducedMotion
                ? false
                : {
                    opacity: 0,
                    scale: 0.95,
                    y: 12,
                  }
            }
            whileInView={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            viewport={{ once: true }}
            transition={{
              duration: 0.7,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-x-0 top-10 bottom-24"
          >
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{
                padding: 0.12,
                maxZoom: 0.95,
              }}
              minZoom={0.1}
              maxZoom={1}
              nodesDraggable={false}
              nodesConnectable={false}
              nodesFocusable={false}
              edgesFocusable={false}
              elementsSelectable={false}
              panOnDrag={false}
              panOnScroll={false}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
              preventScrolling={false}
              proOptions={{
                hideAttribution: true,
              }}
            >
              <Background
                color="var(--color-foreground)"
                gap={24}
                size={0.8}
                style={{
                  opacity: 0.06,
                }}
              />
            </ReactFlow>
          </motion.div>

          {/* Outcome cards */}
          <div className="absolute right-4 bottom-4 left-4 z-10 grid grid-cols-2 gap-2">
            <motion.div
              animate={
                reducedMotion
                  ? undefined
                  : activeOutcome === 'conversion'
                    ? { scale: [1, 1.06, 1] }
                    : { scale: 1 }
              }
              transition={{
                duration: 0.5,
              }}
              className="bg-background/95 relative border-2 border-dashed border-emerald-500/30 p-3 shadow-sm backdrop-blur"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-muted-foreground text-[10px]">
                  Conversions
                </span>

                <CheckIcon className="size-3.5 text-emerald-500" />
              </div>

              <div className="mt-1 flex items-center gap-2">
                <motion.span
                  key={conversions}
                  initial={
                    reducedMotion
                      ? false
                      : {
                          scale: 1.2,
                          opacity: 0.6,
                        }
                  }
                  animate={{
                    scale: 1,
                    opacity: 1,
                  }}
                  transition={{
                    duration: 0.35,
                  }}
                  className="text-foreground text-lg font-semibold tabular-nums"
                >
                  {conversions.toLocaleString()}
                </motion.span>

                <ArrowUpRightIcon className="size-3.5 text-emerald-500" />
              </div>

              <p className="mt-1 text-[10px] text-emerald-500">
                38.5% converted
              </p>
            </motion.div>

            <motion.div
              animate={
                reducedMotion
                  ? undefined
                  : activeOutcome === 'dropoff'
                    ? { scale: [1, 1.06, 1] }
                    : { scale: 1 }
              }
              transition={{
                duration: 0.5,
              }}
              className="bg-background/95 relative border-2 border-dashed border-red-500/30 p-3 shadow-sm backdrop-blur"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-muted-foreground text-[10px]">
                  Drop-offs
                </span>

                <XIcon className="size-3.5 text-red-500" />
              </div>

              <motion.span
                key={dropoffs}
                initial={
                  reducedMotion
                    ? false
                    : {
                        scale: 1.2,
                        opacity: 0.6,
                      }
                }
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                transition={{
                  duration: 0.35,
                }}
                className="text-foreground mt-1 inline-block text-lg font-semibold tabular-nums"
              >
                {dropoffs.toLocaleString()}
              </motion.span>

              <p className="mt-1 text-[10px] text-red-500">61.5% exited</p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
