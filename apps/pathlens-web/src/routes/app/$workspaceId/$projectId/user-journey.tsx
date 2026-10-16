import { createFileRoute } from '@tanstack/react-router'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import type { UserJourneyRange } from '@workspace/contracts'

import { Button } from '@workspace/ui/components/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Separator } from '@workspace/ui/components/separator'

import { LoaderIcon, PauseIcon, PlayIcon, RefreshCcwIcon } from 'lucide-react'

import { DomainSwitcher } from './-components/common/domain-switcher'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getUserJourneyOptions } from '@/queries/user-journey'
import { getProjectDomainsOptions } from '@/queries/domains'
import { useRelativeTime } from '@/hooks/use-relative-time'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/user-journey'
)({
  component: RouteComponent,
})

const rangeLabels = [
  {
    value: '24h',
    label: 'Last 24 hours',
  },
  {
    value: '7d',
    label: 'Last 7 days',
  },
  {
    value: '30d',
    label: 'Last 30 days',
  },
  {
    value: '90d',
    label: 'Last 90 days',
  },
]

type JourneyNodeType = 'entry' | 'page' | 'action' | 'dropoff'

type ApiJourneyNode = {
  id: string
  title: string
  subtitle: string
  type: JourneyNodeType
  depth: number
  visitors: number
  rate: number
  averageTime: string
  description: string
}

type ApiJourneyEdge = {
  id: string
  from: string
  to: string
  visitors: number
  rate: number
  segment: string
}

type JourneyNodeData = {
  title: string
  subtitle: string
  type: JourneyNodeType
  visitors: number
  rate: number
  averageTime: string
  description: string
}

type JourneyFlowNode = Node<JourneyNodeData, 'journey'>

const nodeTypes = {
  journey: JourneyNode,
}

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const rangeLocal = localStorage.getItem('range')
  const [range, setRange] = useState<UserJourneyRange>(
    (rangeLocal || '7d') as UserJourneyRange
  )
  const [liveMode, setLiveMode] = useState(false)
  const [domain, setDomain] = useState('')

  const {
    data: journeyData,
    isLoading,
    refetch,
    dataUpdatedAt,
    isRefetching,
  } = useQuery(
    getUserJourneyOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range,
      device: 'all',
      domain,
    })
  )

  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    getProjectDomainsOptions(projectId)
  )

  const journey = journeyData?.data

  const domains = domainsData?.data

  const lastUpdated = useRelativeTime(dataUpdatedAt)

  useEffect(() => {
    if (!domains?.length) return

    setDomain((currentDomain) => {
      if (currentDomain) return currentDomain

      return domains[0]?.domain ?? ''
    })
  }, [domains])

  /*
   * Live refresh
   *
   * Change 10_000 if you want a different refresh interval.
   */
  useEffect(() => {
    if (!liveMode) return

    const interval = window.setInterval(() => {
      void refetch()
    }, 10_000)

    return () => {
      window.clearInterval(interval)
    }
  }, [liveMode, refetch])

  const flowNodes = useMemo(() => {
    if (!journey?.nodes?.length) return []

    return getFlowNodes(journey.nodes as ApiJourneyNode[])
  }, [journey?.nodes])

  const flowEdges = useMemo(() => {
    if (!journey?.edges?.length || !journey?.nodes?.length) {
      return []
    }

    return getFlowEdges(
      journey.edges as ApiJourneyEdge[],
      journey.nodes as ApiJourneyNode[]
    )
  }, [journey?.edges, journey?.nodes])

  return (
    <div>
      {/* Top toolbar */}
      <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
        <div className="flex items-center gap-4">
          <DomainSwitcher
            loading={domainsLoading}
            domain={domain}
            setDomain={setDomain}
            domains={domains ?? []}
            refetch={refetch}
          />

          <Separator orientation="vertical" />

          <div className="flex items-center justify-between gap-3">
            {!!dataUpdatedAt && (
              <p className="text-muted-foreground text-sm">
                Last updated {lastUpdated}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            data-live={liveMode}
            onClick={() => {
              setLiveMode((current) => !current)
            }}
            className="data-[live=true]:bg-primary/20! data-[live=true]:border-primary! data-[live=true]:text-primary! duration-200 data-[live=true]:border-dashed!"
            variant="outline"
          >
            {liveMode ? <PauseIcon /> : <PlayIcon />}
            Live Refresh
          </Button>

          <Button
            disabled={isRefetching}
            onClick={() => {
              void refetch()
            }}
            variant="outline"
          >
            <RefreshCcwIcon className={isRefetching ? 'animate-spin' : ''} />
            Refresh
          </Button>

          <Separator orientation="vertical" />

          <Select
            items={rangeLabels}
            value={range}
            onValueChange={(value) => {
              if (!value) return

              setRange(value as UserJourneyRange)
              localStorage.setItem('range', value)
            }}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>

            <SelectContent alignItemWithTrigger={false}>
              {rangeLabels.map((rangeItem) => (
                <SelectItem key={rangeItem.value} value={rangeItem.value}>
                  {rangeItem.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Page content */}
      <div className="mx-auto space-y-4 p-6">
        <div>
          <p className="text-xl font-medium">User Journey</p>

          <p className="text-muted-foreground text-sm">
            Visualize how users navigate through your project and interact with
            key pages.
          </p>
        </div>

        {/* Summary */}
        {journey?.summary && (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <SummaryCard label="Visitors" value={journey.summary.visitors} />

            <SummaryCard
              label="Branches"
              value={journey.summary.activeBranches}
            />

            <SummaryCard
              label="Conversions"
              value={journey.summary.conversionBranches}
            />

            <SummaryCard
              label="Drop-offs"
              value={journey.summary.dropoffBranches}
            />

            <SummaryCard
              label="Conversion rate"
              value={`${journey.summary.conversionRate}%`}
            />

            <SummaryCard
              label="Avg. conversion"
              value={journey.summary.avgTimeToConvert}
            />
          </div>
        )}

        {/* Journey flow */}
        <div className="bg-card/30 h-[calc(100vh-320px)] w-full overflow-hidden border-2 border-dashed">
          {isLoading ? (
            <JourneyLoading />
          ) : flowNodes.length === 0 ? (
            <JourneyEmpty />
          ) : (
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{
                padding: 0.2,
                maxZoom: 1,
              }}
              minZoom={0.15}
              maxZoom={1.5}
              nodesDraggable={false}
              nodesConnectable={false}
              nodesFocusable
              edgesFocusable
              elementsSelectable
              deleteKeyCode={null}
              proOptions={{
                hideAttribution: true,
              }}
            >
              <Background color="var(--color-foreground)" gap={32} size={1.2} />
            </ReactFlow>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="bg-card/30 border-2 border-dashed p-4">
      <p className="text-muted-foreground text-xs">{label}</p>

      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  )
}

function JourneyLoading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <LoaderIcon className="text-muted-foreground mx-auto mb-3 size-5 animate-spin" />

        <p className="text-sm font-medium">Loading user journey</p>

        <p className="text-muted-foreground mt-1 text-xs">
          Preparing journey visualization...
        </p>
      </div>
    </div>
  )
}

function JourneyEmpty() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-medium">No journey data</p>

        <p className="text-muted-foreground mt-1 text-sm">
          No user activity was recorded for this period.
        </p>
      </div>
    </div>
  )
}

function JourneyNode({ data, selected }: NodeProps<JourneyFlowNode>) {
  const styles = getJourneyNodeStyles(data.type)

  return (
    <div
      data-selected={selected}
      className={`bg-background data-[selected=true]:ring-primary/30 w-[280px] overflow-hidden border-2 border-dashed shadow-sm transition-all duration-200 data-[selected=true]:ring-2 ${styles.container} `}
    >
      {data.type !== 'entry' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!bg-muted-foreground !border-background !h-2.5 !w-2.5 !border-2"
        />
      )}

      <div className="p-4">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <div className={`size-2 rounded-full ${styles.indicator}`} />

              <span
                className={`text-[10px] font-semibold tracking-wider uppercase ${styles.label}`}
              >
                {getJourneyNodeLabel(data.type)}
              </span>
            </div>

            <p
              title={data.title}
              className="line-clamp-2 text-sm leading-snug font-semibold"
            >
              {data.title}
            </p>

            <p
              title={data.subtitle}
              className="text-muted-foreground mt-1 truncate text-xs"
            >
              {data.subtitle}
            </p>
          </div>

          <span className="text-xs font-medium">{formatRate(data.rate)}%</span>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t pt-3">
          <div>
            <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
              Visitors
            </p>

            <p className="mt-1 text-sm font-semibold">{data.visitors}</p>
          </div>

          <div>
            <p className="text-muted-foreground text-[10px] tracking-wide uppercase">
              Avg. time
            </p>

            <p className="mt-1 text-sm font-semibold">{data.averageTime}</p>
          </div>
        </div>

        {data.description && (
          <p className="text-muted-foreground mt-3 line-clamp-2 border-t pt-3 text-[11px] leading-relaxed">
            {data.description}
          </p>
        )}
      </div>

      {data.type !== 'dropoff' && (
        <Handle
          type="source"
          position={Position.Right}
          className="!bg-muted-foreground !border-background !h-2.5 !w-2.5 !border-2"
        />
      )}
    </div>
  )
}

function getJourneyNodeStyles(type: JourneyNodeType) {
  switch (type) {
    case 'entry':
      return {
        container: 'border-blue-500/50',
        indicator: 'bg-blue-500',
        label: 'text-blue-500',
      }

    case 'page':
      return {
        container: 'border-border',
        indicator: 'bg-emerald-500',
        label: 'text-emerald-500',
      }

    case 'action':
      return {
        container: 'border-violet-500/50',
        indicator: 'bg-violet-500',
        label: 'text-violet-500',
      }

    case 'dropoff':
      return {
        container: 'border-red-500/50',
        indicator: 'bg-red-500',
        label: 'text-red-500',
      }
  }
}

function getJourneyNodeLabel(type: JourneyNodeType) {
  switch (type) {
    case 'entry':
      return 'Entry'

    case 'page':
      return 'Page view'

    case 'action':
      return 'Action'

    case 'dropoff':
      return 'Drop-off'
  }
}

function formatRate(rate: number) {
  if (Number.isInteger(rate)) {
    return rate.toString()
  }

  return rate.toFixed(1)
}

function getFlowNodes(nodes: ApiJourneyNode[]): JourneyFlowNode[] {
  const nodesByDepth = new Map<number, ApiJourneyNode[]>()

  for (const node of nodes) {
    const existingNodes = nodesByDepth.get(node.depth) ?? []

    existingNodes.push(node)

    nodesByDepth.set(node.depth, existingNodes)
  }

  const nodeHeight = 190
  const verticalGap = 60
  const horizontalGap = 380

  return nodes.map((node) => {
    const depthNodes = nodesByDepth.get(node.depth) ?? []

    const indexAtDepth = depthNodes.findIndex(
      (depthNode) => depthNode.id === node.id
    )

    const totalHeight =
      depthNodes.length * nodeHeight +
      Math.max(0, depthNodes.length - 1) * verticalGap

    const startY = -totalHeight / 2

    const y = startY + indexAtDepth * (nodeHeight + verticalGap)

    return {
      id: node.id,

      type: 'journey',

      position: {
        x: node.depth * horizontalGap,
        y,
      },

      data: {
        title: node.title,
        subtitle: node.subtitle,
        type: node.type,
        visitors: node.visitors,
        rate: node.rate,
        averageTime: node.averageTime,
        description: node.description,
      },
    }
  })
}

function getFlowEdges(
  edges: ApiJourneyEdge[],
  nodes: ApiJourneyNode[]
): Edge[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))

  return edges.map((edge) => {
    const targetNode = nodeMap.get(edge.to)

    const isDropoff = targetNode?.type === 'dropoff'

    return {
      id: edge.id,

      source: edge.from,
      target: edge.to,

      type: 'smoothstep',

      animated: false,

      label: `${edge.visitors} ${
        edge.visitors === 1 ? 'visitor' : 'visitors'
      } · ${formatRate(edge.rate)}%`,

      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 16,
        height: 16,
        color: isDropoff ? 'var(--destructive)' : 'var(--muted-foreground)',
      },

      style: {
        stroke: isDropoff ? 'var(--destructive)' : 'var(--muted-foreground)',

        strokeWidth: getEdgeWidth(edge.rate),

        opacity: isDropoff ? 0.8 : 0.6,
      },

      labelStyle: {
        fill: 'var(--muted-foreground)',
        fontSize: 11,
        fontWeight: 500,
      },

      labelBgStyle: {
        fill: 'var(--background)',
        fillOpacity: 0.95,
      },

      labelBgPadding: [6, 4],

      labelBgBorderRadius: 6,
    }
  })
}

function getEdgeWidth(rate: number) {
  if (rate >= 75) {
    return 3
  }

  if (rate >= 40) {
    return 2.5
  }

  if (rate >= 20) {
    return 2
  }

  return 1.5
}
