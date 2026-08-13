import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  PageToolbar,
} from '@/components/common/project-page'
import { formatNumber } from '@/utils/utils'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { cn } from '@workspace/ui/lib/utils'
import { createFileRoute } from '@tanstack/react-router'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowDownRight,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Globe,
  Maximize2,
  Minus,
  MousePointerClick,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Users,
  XCircle,
} from 'lucide-react'
import {
  useCallback,
  useRef,
  useState,
  type PointerEvent,
  type WheelEvent,
} from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/user-journey'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'User Journey',
  },
})

const GRAPH_WIDTH = 1450
const GRAPH_HEIGHT = 680
const NODE_WIDTH = 210
const NODE_HEIGHT = 112
const MIN_SCALE = 0.24
const MAX_SCALE = 1.15

type JourneyNodeType = 'entry' | 'page' | 'action' | 'conversion' | 'dropoff'
type JourneySegment = 'all' | 'conversion' | 'dropoff'

interface JourneyNode {
  id: string
  title: string
  subtitle: string
  type: JourneyNodeType
  x: number
  y: number
  visitors: number
  rate: number
  averageTime: string
  description: string
}

interface JourneyEdge {
  id: string
  from: string
  to: string
  label: string
  segment: 'shared' | 'conversion' | 'dropoff'
}

interface Point {
  x: number
  y: number
}

const journeyNodes: JourneyNode[] = [
  {
    id: 'entry',
    title: 'First touch',
    subtitle: 'All entry points',
    type: 'entry',
    x: 48,
    y: 284,
    visitors: 1842,
    rate: 100,
    averageTime: '—',
    description:
      'Visitors entering the selected journey from any tracked source or campaign.',
  },
  {
    id: 'landing',
    title: 'Landing page',
    subtitle: '/',
    type: 'page',
    x: 320,
    y: 284,
    visitors: 1842,
    rate: 100,
    averageTime: '00:03',
    description:
      'The most common starting page for visitors in this journey segment.',
  },
  {
    id: 'pricing',
    title: 'Pricing page',
    subtitle: '/pricing',
    type: 'page',
    x: 612,
    y: 90,
    visitors: 1120,
    rate: 60.8,
    averageTime: '00:18',
    description:
      'Visitors comparing plans and evaluating the next step toward signup.',
  },
  {
    id: 'docs',
    title: 'Documentation',
    subtitle: '/docs/getting-started',
    type: 'page',
    x: 612,
    y: 458,
    visitors: 722,
    rate: 39.2,
    averageTime: '00:24',
    description:
      'Visitors exploring implementation details before returning to the main path.',
  },
  {
    id: 'trial',
    title: 'Start trial',
    subtitle: 'cta_click',
    type: 'action',
    x: 918,
    y: 90,
    visitors: 860,
    rate: 46.7,
    averageTime: '00:31',
    description:
      'The primary call to action that moves a visitor from consideration to signup.',
  },
  {
    id: 'account',
    title: 'Account created',
    subtitle: 'signup_completed',
    type: 'conversion',
    x: 1224,
    y: 90,
    visitors: 610,
    rate: 33.1,
    averageTime: '01:12',
    description:
      'The selected conversion point for this journey, reached after a completed signup.',
  },
  {
    id: 'exit',
    title: 'Journey exit',
    subtitle: 'session_end',
    type: 'dropoff',
    x: 918,
    y: 458,
    visitors: 445,
    rate: 24.2,
    averageTime: '00:12',
    description:
      'Visitors who left the journey before reaching the selected conversion point.',
  },
]

const journeyEdges: JourneyEdge[] = [
  {
    id: 'entry-landing',
    from: 'entry',
    to: 'landing',
    label: '1,842 visitors',
    segment: 'shared',
  },
  {
    id: 'landing-pricing',
    from: 'landing',
    to: 'pricing',
    label: '61% continue',
    segment: 'shared',
  },
  {
    id: 'landing-docs',
    from: 'landing',
    to: 'docs',
    label: '39% explore',
    segment: 'shared',
  },
  {
    id: 'pricing-trial',
    from: 'pricing',
    to: 'trial',
    label: '77% continue',
    segment: 'conversion',
  },
  {
    id: 'pricing-exit',
    from: 'pricing',
    to: 'exit',
    label: '23% leave',
    segment: 'dropoff',
  },
  {
    id: 'docs-trial',
    from: 'docs',
    to: 'trial',
    label: '54% return',
    segment: 'conversion',
  },
  {
    id: 'docs-exit',
    from: 'docs',
    to: 'exit',
    label: '46% leave',
    segment: 'dropoff',
  },
  {
    id: 'trial-account',
    from: 'trial',
    to: 'account',
    label: '71% convert',
    segment: 'conversion',
  },
  {
    id: 'trial-exit',
    from: 'trial',
    to: 'exit',
    label: '29% leave',
    segment: 'dropoff',
  },
]

const nodeMeta: Record<
  JourneyNodeType,
  {
    label: string
    icon: LucideIcon
    iconClassName: string
    colorClassName: string
  }
> = {
  entry: {
    label: 'Entry',
    icon: Globe,
    iconClassName: 'text-sky-600 dark:text-sky-300',
    colorClassName: 'border-sky-500/40 bg-sky-500/[0.08]',
  },
  page: {
    label: 'Page view',
    icon: RouteIcon,
    iconClassName: 'text-violet-600 dark:text-violet-300',
    colorClassName: 'border-violet-500/40 bg-violet-500/[0.08]',
  },
  action: {
    label: 'Action',
    icon: MousePointerClick,
    iconClassName: 'text-amber-600 dark:text-amber-300',
    colorClassName: 'border-amber-500/40 bg-amber-500/[0.08]',
  },
  conversion: {
    label: 'Conversion',
    icon: CheckCircle2,
    iconClassName: 'text-emerald-600 dark:text-emerald-300',
    colorClassName: 'border-emerald-500/40 bg-emerald-500/[0.08]',
  },
  dropoff: {
    label: 'Drop-off',
    icon: XCircle,
    iconClassName: 'text-rose-600 dark:text-rose-300',
    colorClassName: 'border-rose-500/40 bg-rose-500/[0.08]',
  },
}

const rangeLabels = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
} as const

function getEdgePath(from: JourneyNode, to: JourneyNode) {
  const startX = from.x + NODE_WIDTH
  const startY = from.y + NODE_HEIGHT / 2
  const endX = to.x
  const endY = to.y + NODE_HEIGHT / 2
  const curve = Math.max((endX - startX) * 0.46, 64)

  return `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`
}

function isEdgeVisible(edge: JourneyEdge, segment: JourneySegment) {
  if (segment === 'all') return true
  return edge.segment === 'shared' || edge.segment === segment
}

function JourneyNodeCard({
  node,
  selected,
  dimmed,
  onSelect,
}: {
  node: JourneyNode
  selected: boolean
  dimmed: boolean
  onSelect: () => void
}) {
  const meta = nodeMeta[node.type]
  const Icon = meta.icon

  return (
    <button
      type="button"
      data-journey-node
      aria-label={`Select ${node.title} journey node`}
      aria-pressed={selected}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onSelect}
      className={cn(
        'focus-visible:ring-ring absolute flex flex-col rounded-xl border p-4 text-left shadow-[0_12px_32px_-20px_color-mix(in_oklch,var(--foreground),transparent_35%)] backdrop-blur-sm transition-[opacity,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-18px_color-mix(in_oklch,var(--foreground),transparent_20%)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        meta.colorClassName,
        selected &&
          'ring-primary/70 ring-offset-background z-20 ring-2 ring-offset-2',
        dimmed && 'opacity-25'
      )}
      style={{
        left: node.x,
        top: node.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      }}
    >
      <span className="flex min-w-0 items-start gap-2.5">
        <span className="bg-background/80 flex size-8 shrink-0 items-center justify-center rounded-lg border shadow-xs">
          <Icon className={cn('size-4', meta.iconClassName)} />
        </span>
        <span className="min-w-0">
          <span className="text-muted-foreground block text-[10px] font-semibold tracking-[0.16em] uppercase">
            {meta.label}
          </span>
          <span className="mt-1 block truncate text-sm font-semibold tracking-tight">
            {node.title}
          </span>
        </span>
      </span>
      <span className="text-muted-foreground mt-3 block truncate font-mono text-[11px]">
        {node.subtitle}
      </span>
      <span className="text-muted-foreground mt-auto flex items-center justify-between gap-2 pt-3 text-[11px]">
        <span>{formatNumber(node.visitors)} visitors</span>
        <span className="font-medium tabular-nums">{node.rate}%</span>
      </span>
    </button>
  )
}

function JourneyMap({
  selectedNodeId,
  segment,
  onSelectNode,
}: {
  selectedNodeId: string
  segment: JourneySegment
  onSelectNode: (nodeId: string) => void
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    clientX: number
    clientY: number
    pan: Point
  } | null>(null)
  const [scale, setScale] = useState(0.72)
  const [pan, setPan] = useState<Point>({ x: 28, y: 24 })

  const fitGraph = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const { width, height } = canvas.getBoundingClientRect()
    const nextScale = Math.min(
      1,
      Math.max(
        MIN_SCALE,
        Math.min((width - 48) / GRAPH_WIDTH, (height - 48) / GRAPH_HEIGHT)
      )
    )

    setScale(nextScale)
    setPan({
      x: Math.max((width - GRAPH_WIDTH * nextScale) / 2, 24),
      y: Math.max((height - GRAPH_HEIGHT * nextScale) / 2, 24),
    })
  }, [])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target
    if (target instanceof Element && target.closest('[data-journey-node]')) {
      return
    }

    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      pan,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    setPan({
      x: drag.pan.x + event.clientX - drag.clientX,
      y: drag.pan.y + event.clientY - drag.clientY,
    })
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const bounds = canvas.getBoundingClientRect()
    const pointer = {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    }
    const nextScale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, scale * (event.deltaY > 0 ? 0.9 : 1.1))
    )
    const worldPoint = {
      x: (pointer.x - pan.x) / scale,
      y: (pointer.y - pan.y) / scale,
    }

    setScale(nextScale)
    setPan({
      x: pointer.x - worldPoint.x * nextScale,
      y: pointer.y - worldPoint.y * nextScale,
    })
  }

  return (
    <div
      ref={canvasRef}
      className="bg-muted/20 relative h-[560px] min-w-0 touch-none overflow-hidden sm:h-[680px]"
      aria-label="Interactive user journey map"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <div
        data-journey-background
        className="absolute top-0 left-0 cursor-grab active:cursor-grabbing"
        style={{
          width: GRAPH_WIDTH,
          height: GRAPH_HEIGHT,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        <svg
          width={GRAPH_WIDTH}
          height={GRAPH_HEIGHT}
          viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
          className="pointer-events-none absolute inset-0 overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <pattern
              id="journey-grid"
              width="32"
              height="32"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 32 0 L 0 0 0 32"
                fill="none"
                stroke="var(--border)"
                strokeOpacity="0.55"
                strokeWidth="1"
              />
            </pattern>
            <marker
              id="journey-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--muted-foreground)" />
            </marker>
          </defs>
          <rect
            width={GRAPH_WIDTH}
            height={GRAPH_HEIGHT}
            fill="url(#journey-grid)"
            opacity="0.72"
          />
          {journeyEdges.map((edge) => {
            const from = journeyNodes.find((node) => node.id === edge.from)
            const to = journeyNodes.find((node) => node.id === edge.to)
            if (!from || !to) return null

            const active = isEdgeVisible(edge, segment)
            const selected =
              edge.from === selectedNodeId || edge.to === selectedNodeId
            const labelX = (from.x + NODE_WIDTH + to.x) / 2
            const labelY = (from.y + to.y + NODE_HEIGHT) / 2 + 6

            return (
              <g
                key={edge.id}
                className={cn(
                  'transition-opacity duration-200',
                  !active && 'opacity-15'
                )}
              >
                <path
                  d={getEdgePath(from, to)}
                  fill="none"
                  stroke={selected ? 'var(--primary)' : 'var(--border)'}
                  strokeWidth={selected ? 2.5 : 1.5}
                  strokeDasharray={
                    edge.segment === 'dropoff' ? '5 7' : undefined
                  }
                  markerEnd="url(#journey-arrow)"
                />
                <rect
                  x={labelX - 48}
                  y={labelY - 13}
                  width="96"
                  height="24"
                  rx="12"
                  fill="var(--card)"
                  stroke="var(--border)"
                  strokeOpacity="0.9"
                />
                <text
                  x={labelX}
                  y={labelY + 4}
                  fill="var(--muted-foreground)"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {edge.label}
                </text>
              </g>
            )
          })}
        </svg>

        {journeyNodes.map((node) => (
          <JourneyNodeCard
            key={node.id}
            node={node}
            selected={node.id === selectedNodeId}
            dimmed={
              (segment === 'conversion' && node.type === 'dropoff') ||
              (segment === 'dropoff' && node.type === 'conversion')
            }
            onSelect={() => onSelectNode(node.id)}
          />
        ))}
      </div>

      <div className="bg-background/85 absolute top-4 left-4 flex items-center gap-1 rounded-lg border p-1 shadow-sm backdrop-blur-sm">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => setScale((value) => Math.max(MIN_SCALE, value - 0.1))}
        >
          <Minus />
        </Button>
        <span className="text-muted-foreground w-12 text-center text-xs tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => setScale((value) => Math.min(MAX_SCALE, value + 0.1))}
        >
          <Plus />
        </Button>
        <span className="bg-border mx-1 h-5 w-px" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Fit journey to view"
          title="Fit journey to view"
          onClick={fitGraph}
        >
          <Maximize2 />
        </Button>
      </div>

      <div className="bg-background/85 text-muted-foreground absolute right-4 bottom-4 hidden items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-sm backdrop-blur-sm sm:flex">
        <span className="bg-foreground size-1.5 rounded-full" />
        Drag to pan · Scroll to zoom · Select a node
      </div>
    </div>
  )
}

function NodeDetails({ node }: { node: JourneyNode }) {
  const meta = nodeMeta[node.type]
  const Icon = meta.icon

  return (
    <aside className="bg-background/75 border-t p-5 lg:border-t-0 lg:border-l">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="bg-muted flex size-9 items-center justify-center rounded-lg">
            <Icon className={cn('size-4', meta.iconClassName)} />
          </span>
          <div>
            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
              Selected node
            </p>
            <h2 className="mt-1 text-sm font-semibold">{node.title}</h2>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0">
          {meta.label}
        </Badge>
      </div>

      <p className="text-muted-foreground mt-5 text-sm leading-6">
        {node.description}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <div className="bg-muted/60 rounded-lg p-3">
          <Users className="text-muted-foreground size-4" />
          <p className="mt-3 text-lg font-semibold tabular-nums">
            {formatNumber(node.visitors)}
          </p>
          <p className="text-muted-foreground text-xs">Visitors</p>
        </div>
        <div className="bg-muted/60 rounded-lg p-3">
          <TrendingMetricIcon type={node.type} />
          <p className="mt-3 text-lg font-semibold tabular-nums">
            {node.rate}%
          </p>
          <p className="text-muted-foreground text-xs">Of journey</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border px-3 py-3 text-sm">
        <span className="text-muted-foreground flex items-center gap-2">
          <Clock3 className="size-4" />
          Average time
        </span>
        <span className="font-medium tabular-nums">{node.averageTime}</span>
      </div>

      <div className="mt-8 border-t pt-5">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.14em] uppercase">
          Path context
        </p>
        <div className="mt-3 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Location</span>
            <span className="max-w-36 truncate text-right font-mono text-xs">
              {node.subtitle}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Next action</span>
            <span className="flex items-center gap-1 text-right text-xs font-medium">
              Explore branches <ArrowRight className="size-3" />
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function TrendingMetricIcon({ type }: { type: JourneyNodeType }) {
  if (type === 'dropoff') {
    return (
      <ArrowDownRight className="size-4 text-rose-600 dark:text-rose-300" />
    )
  }

  return (
    <ArrowRight className="size-4 text-emerald-600 dark:text-emerald-300" />
  )
}

function RouteComponent() {
  const [range, setRange] = useState<keyof typeof rangeLabels>('7d')
  const [device, setDevice] = useState('all')
  const [segment, setSegment] = useState<JourneySegment>('all')
  const [selectedNodeId, setSelectedNodeId] = useState('landing')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const selectedNode =
    journeyNodes.find((node) => node.id === selectedNodeId) ?? journeyNodes[0]

  const refreshJourney = () => {
    setIsRefreshing(true)
    window.setTimeout(() => setIsRefreshing(false), 600)
  }

  return (
    <ProjectPageLayout className="max-w-[1600px]">
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Behaviour · Path Analysis"
          title="User Journey"
          description="Trace the paths visitors take through your product and spot the moments that lead to conversion or drop-off."
          actions={
            <Button
              variant="outline"
              onClick={refreshJourney}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn(isRefreshing && 'animate-spin')} />
              Refresh paths
            </Button>
          }
        />

        <PageToolbar>
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            {isRefreshing
              ? 'Refreshing journey view...'
              : `Showing representative paths · ${rangeLabels[range]} · ${device === 'all' ? 'all devices' : device}`}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={range}
              onValueChange={(value) => {
                if (value && value in rangeLabels) {
                  setRange(value as keyof typeof rangeLabels)
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={device}
              onValueChange={(value) => value && setDevice(value)}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All devices</SelectItem>
                <SelectItem value="desktop">Desktop</SelectItem>
                <SelectItem value="mobile">Mobile</SelectItem>
                <SelectItem value="tablet">Tablet</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={segment}
              onValueChange={(value) => {
                if (value) setSegment(value as JourneySegment)
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Journey segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All paths</SelectItem>
                <SelectItem value="conversion">Conversion paths</SelectItem>
                <SelectItem value="dropoff">Drop-off paths</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PageToolbar>

        <ProjectMetricStrip className="lg:grid-cols-4">
          <ProjectMetric
            label="Visitors in path"
            value="1,842"
            icon={Users}
            detail="Across all entry points"
          />
          <ProjectMetric
            label="Active branches"
            value="6"
            icon={RouteIcon}
            detail="3 conversion · 3 drop-off"
          />
          <ProjectMetric
            label="Conversion rate"
            value="33.1%"
            icon={CheckCircle2}
            detail="+4.8% vs previous period"
          />
          <ProjectMetric
            label="Avg. time to convert"
            value="01:12"
            icon={Clock3}
            detail="From first touch"
          />
        </ProjectMetricStrip>

        <Card className="overflow-hidden py-0">
          <CardHeader className="border-b py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Visitor flow</CardTitle>
                <CardDescription>
                  Select a node to inspect its place in the journey.
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {(
                  Object.entries(nodeMeta) as [
                    JourneyNodeType,
                    (typeof nodeMeta)[JourneyNodeType],
                  ][]
                ).map(([type, meta]) => {
                  const Icon = meta.icon
                  return (
                    <span
                      key={type}
                      className="text-muted-foreground flex items-center gap-1.5 text-xs"
                    >
                      <Icon className={cn('size-3.5', meta.iconClassName)} />
                      {meta.label}
                    </span>
                  )
                })}
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid p-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <JourneyMap
              selectedNodeId={selectedNode.id}
              segment={segment}
              onSelectNode={setSelectedNodeId}
            />
            <NodeDetails node={selectedNode} />
          </CardContent>
        </Card>
      </div>
    </ProjectPageLayout>
  )
}
