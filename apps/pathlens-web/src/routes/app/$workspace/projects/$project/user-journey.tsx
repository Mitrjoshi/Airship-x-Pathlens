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
import { useQuery } from '@tanstack/react-query'
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge as FlowEdge,
  type Node as FlowNode,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  getUserJourneyOptions,
  type UserJourneyDevice,
  type UserJourneyEdge,
  type UserJourneyNode,
  type UserJourneyRange,
} from '@/queries/user-journey'
import {
  ArrowDownRight,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Globe,
  MousePointerClick,
  RefreshCw,
  Route as RouteIcon,
  Users,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/user-journey'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'User Journey',
  },
})

const NODE_WIDTH = 210
const NODE_HEIGHT = 112
const GRAPH_PADDING = 48
const COLUMN_GAP = 82
const ROW_GAP = 48

type JourneyNodeType = 'entry' | 'page' | 'action' | 'conversion' | 'dropoff'
type JourneySegment = 'all' | 'conversion' | 'dropoff'

type JourneyNode = UserJourneyNode & Point
type JourneyEdge = UserJourneyEdge

interface Point {
  x: number
  y: number
}

type JourneyFlowNodeData = {
  node: JourneyNode
  dimmed: boolean
  selected: boolean
  onSelect: () => void
}

type JourneyFlowNode = FlowNode<JourneyFlowNodeData, 'journey'>
type JourneyFlowEdge = FlowEdge

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

function layoutJourneyNodes(sourceNodes: UserJourneyNode[]) {
  const columns = new Map<number, UserJourneyNode[]>()

  for (const node of sourceNodes) {
    const column = columns.get(node.depth) ?? []
    column.push(node)
    columns.set(node.depth, column)
  }

  const positions = new Map<string, Point>()

  for (const [depth, column] of columns) {
    column.forEach((node, index) => {
      positions.set(node.id, {
        x: GRAPH_PADDING + depth * (NODE_WIDTH + COLUMN_GAP),
        y: GRAPH_PADDING + index * (NODE_HEIGHT + ROW_GAP),
      })
    })
  }

  return sourceNodes.map((node) => ({
    ...node,
    ...(positions.get(node.id) ?? { x: GRAPH_PADDING, y: GRAPH_PADDING }),
  }))
}

function getEdgeLabel(edge: JourneyEdge) {
  if (edge.from === 'entry') return `${formatNumber(edge.visitors)} visitors`
  if (edge.segment === 'conversion') return `${edge.rate}% convert`
  if (edge.segment === 'dropoff') return `${edge.rate}% leave`

  return `${edge.rate}% continue`
}

function isEdgeVisible(edge: JourneyEdge, segment: JourneySegment) {
  if (segment === 'all') return true
  return edge.segment === 'shared' || edge.segment === segment
}

function JourneyFlowNode({ data }: NodeProps<JourneyFlowNode>) {
  const { node, dimmed, selected, onSelect } = data
  const meta = nodeMeta[node.type]
  const Icon = meta.icon

  return (
    <>
      {node.type !== 'entry' && (
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={false}
          className="!border-background !bg-muted-foreground !h-2 !w-2 !border-2"
        />
      )}
      <button
        type="button"
        data-journey-node
        aria-label={`Select ${node.title} journey node`}
        aria-pressed={selected}
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
        className={cn(
          'nodrag nopan focus-visible:ring-ring flex flex-col rounded-xl border p-4 text-left shadow-[0_12px_32px_-20px_color-mix(in_oklch,var(--foreground),transparent_35%)] backdrop-blur-sm transition-[opacity,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-18px_color-mix(in_oklch,var(--foreground),transparent_20%)] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          meta.colorClassName,
          selected &&
            'ring-primary/70 ring-offset-background z-20 ring-2 ring-offset-2',
          dimmed && 'opacity-25'
        )}
        style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
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
      {node.type !== 'dropoff' && (
        <Handle
          type="source"
          position={Position.Right}
          isConnectable={false}
          className="!border-background !bg-muted-foreground !h-2 !w-2 !border-2"
        />
      )}
    </>
  )
}

const journeyNodeTypes = { journey: JourneyFlowNode }

function getFlowNodes(
  sourceNodes: UserJourneyNode[],
  selectedNodeId: string,
  segment: JourneySegment,
  onSelectNode: (nodeId: string) => void
): JourneyFlowNode[] {
  return layoutJourneyNodes(sourceNodes).map((node) => ({
    id: node.id,
    type: 'journey',
    position: { x: node.x, y: node.y },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
    style: { width: NODE_WIDTH, height: NODE_HEIGHT },
    data: {
      node,
      selected: node.id === selectedNodeId,
      dimmed:
        (segment === 'conversion' && node.type === 'dropoff') ||
        (segment === 'dropoff' && node.type === 'conversion'),
      onSelect: () => onSelectNode(node.id),
    },
  }))
}

function getFlowEdges(
  sourceEdges: UserJourneyEdge[],
  selectedNodeId: string,
  segment: JourneySegment
): JourneyFlowEdge[] {
  return sourceEdges.map((edge) => {
    const active = isEdgeVisible(edge, segment)
    const selected = edge.from === selectedNodeId || edge.to === selectedNodeId

    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: 'bezier',
      label: getEdgeLabel(edge),
      labelStyle: {
        fill: 'var(--muted-foreground)',
        fontSize: 10,
        fontWeight: 600,
      },
      labelBgStyle: {
        fill: 'var(--card)',
        fillOpacity: 0.95,
        stroke: 'var(--border)',
      },
      labelBgPadding: [8, 4],
      labelBgBorderRadius: 12,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: 'var(--muted-foreground)',
      },
      style: {
        stroke: selected ? 'var(--primary)' : 'var(--border)',
        strokeDasharray: edge.segment === 'dropoff' ? '5 7' : undefined,
        strokeWidth: selected ? 2.5 : 1.5,
        opacity: active ? 1 : 0.15,
      },
    }
  })
}

function JourneyFlowCanvas({
  nodes: sourceNodes,
  edges,
  selectedNodeId,
  segment,
  onSelectNode,
}: {
  nodes: UserJourneyNode[]
  edges: UserJourneyEdge[]
  selectedNodeId: string
  segment: JourneySegment
  onSelectNode: (nodeId: string) => void
}) {
  const { fitView } = useReactFlow()
  const flowNodes = getFlowNodes(
    sourceNodes,
    selectedNodeId,
    segment,
    onSelectNode
  )
  const flowEdges = getFlowEdges(edges, selectedNodeId, segment)

  useEffect(() => {
    if (sourceNodes.length > 0) {
      void fitView({ padding: 0.2, duration: 220 })
    }
  }, [fitView, sourceNodes])

  return (
    <ReactFlow
      nodes={flowNodes}
      edges={flowEdges}
      nodeTypes={journeyNodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
      minZoom={0.24}
      maxZoom={1.15}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      onNodeClick={(_, node) => onSelectNode(node.id)}
      className="bg-muted/20"
    >
      <Background
        variant={BackgroundVariant.Cross}
        gap={100}
        size={1}
        color="var(--primary)"
        bgColor="var(--sidebar)"
      />
      {/* <Controls
        position="top-left"
        showInteractive={false}
        className="!border-border !bg-background shadow-sm"
      /> */}
    </ReactFlow>
  )
}

function JourneyMap({
  nodes,
  edges,
  selectedNodeId,
  segment,
  onSelectNode,
  isLoading,
}: {
  nodes: UserJourneyNode[]
  edges: UserJourneyEdge[]
  selectedNodeId: string
  segment: JourneySegment
  onSelectNode: (nodeId: string) => void
  isLoading: boolean
}) {
  return (
    <div
      className="bg-muted/20 relative h-[560px] min-w-0 overflow-hidden sm:h-[680px]"
      aria-label="Interactive user journey map"
    >
      <ReactFlowProvider>
        <JourneyFlowCanvas
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          segment={segment}
          onSelectNode={onSelectNode}
        />
      </ReactFlowProvider>

      {(isLoading || nodes.length === 0) && (
        <div className="bg-background/90 absolute inset-0 z-10 flex items-center justify-center p-6 text-center backdrop-blur-sm">
          <p className="text-muted-foreground max-w-sm text-sm">
            {isLoading
              ? 'Loading visitor paths...'
              : 'No visitor paths were recorded for these filters yet.'}
          </p>
        </div>
      )}

      <div className="bg-background/85 text-muted-foreground pointer-events-none absolute right-4 bottom-4 hidden items-center gap-2 rounded-lg border px-3 py-2 text-xs shadow-sm backdrop-blur-sm sm:flex">
        <span className="bg-foreground size-1.5 rounded-full" />
        Drag to pan · Scroll to zoom · Select a node
      </div>
    </div>
  )
}

function NodeDetails({ node }: { node: UserJourneyNode | null }) {
  if (!node) {
    return (
      <aside className="bg-background/75 border-t p-5 lg:border-t-0 lg:border-l">
        <p className="text-muted-foreground text-sm leading-6">
          Select a journey node to inspect its visitor activity.
        </p>
      </aside>
    )
  }

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
            <span className="text-muted-foreground">Journey step</span>
            <span className="text-right text-xs font-medium tabular-nums">
              {node.depth + 1}
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
  const { workspace, project } = Route.useParams()
  const [range, setRange] = useState<UserJourneyRange>('7d')
  const [device, setDevice] = useState<UserJourneyDevice>('all')
  const [segment, setSegment] = useState<JourneySegment>('all')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const {
    data: journeyResponse,
    isError,
    isPending,
    isRefetching,
    refetch,
  } = useQuery(
    getUserJourneyOptions({
      workspace_id: workspace,
      project_id: project,
      range,
      device,
    })
  )
  const journey = journeyResponse?.data
  const journeyNodes = journey?.nodes ?? []
  const journeyEdges = journey?.edges ?? []
  const selectedNode =
    journeyNodes.find((node) => node.id === selectedNodeId) ??
    journeyNodes[0] ??
    null
  const isRefreshing = isRefetching

  const refreshJourney = () => {
    void refetch()
  }

  return (
    <ProjectPageLayout>
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
            <span
              className={cn(
                'size-1.5 rounded-full',
                isError ? 'bg-destructive' : 'bg-emerald-500'
              )}
            />
            {isRefreshing
              ? 'Refreshing journey view...'
              : isError
                ? 'Unable to load journey data'
                : `Visitor paths · ${rangeLabels[range]} · ${device === 'all' ? 'all devices' : device}`}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={range}
              onValueChange={(value) => {
                if (value && value in rangeLabels) {
                  setRange(value as UserJourneyRange)
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
              onValueChange={(value) => {
                if (
                  value === 'all' ||
                  value === 'desktop' ||
                  value === 'mobile' ||
                  value === 'tablet'
                ) {
                  setDevice(value)
                }
              }}
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

        {isError && (
          <p className="text-destructive text-sm">
            Unable to load visitor paths for the selected filters.
          </p>
        )}

        <ProjectMetricStrip className="lg:grid-cols-4">
          <ProjectMetric
            label="Visitors in path"
            value={formatNumber(journey?.summary.visitors ?? 0)}
            icon={Users}
            detail="Across all entry points"
            isLoading={isPending}
          />
          <ProjectMetric
            label="Active branches"
            value={formatNumber(journey?.summary.activeBranches ?? 0)}
            icon={RouteIcon}
            detail={`${journey?.summary.conversionBranches ?? 0} conversion · ${journey?.summary.dropoffBranches ?? 0} drop-off`}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Conversion rate"
            value={`${journey?.summary.conversionRate ?? 0}%`}
            icon={CheckCircle2}
            detail="Visitors reaching a conversion signal"
            isLoading={isPending}
          />
          <ProjectMetric
            label="Avg. time to convert"
            value={journey?.summary.avgTimeToConvert ?? '0s'}
            icon={Clock3}
            detail="From first touch"
            isLoading={isPending}
          />
        </ProjectMetricStrip>

        <Card className="gap-0 overflow-hidden py-0">
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

          <CardContent className="grid px-0 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <JourneyMap
              nodes={journeyNodes}
              edges={journeyEdges}
              selectedNodeId={selectedNode?.id ?? ''}
              segment={segment}
              onSelectNode={setSelectedNodeId}
              isLoading={isPending}
            />
            <NodeDetails node={selectedNode} />
          </CardContent>
        </Card>
      </div>
    </ProjectPageLayout>
  )
}
