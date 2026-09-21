import { useEffect, useMemo } from 'react'
import {
  Background,
  Handle,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import {
  Activity,
  BarChart3,
  Brain,
  CodeXml,
  Crosshair,
  Database,
  Eye,
  FileBarChart,
  Folder,
  Gauge,
  Globe2,
  KeyRound,
  MousePointerClick,
  Play,
  Rocket,
  ShieldCheck,
  Target,
  TrendingUp,
  UserRound,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

/* -------------------------------------------------------------------------- */
/*                                   COLORS                                   */
/* -------------------------------------------------------------------------- */

const colors = {
  orange: '#ff5a17',
  cyan: '#35d6ce',
  blue: '#3ba7ff',
  pink: '#eb45d5',
}

type PresetColor = keyof typeof colors

type WorkflowColorToken = {
  hex: string
  hue?: number
}

type WorkflowColor = PresetColor | (string & {}) | WorkflowColorToken

const getColor = (color?: WorkflowColor) => {
  if (!color) return colors.blue

  if (typeof color === 'object') return color.hex

  if (color in colors) {
    return colors[color as PresetColor]
  }

  return color
}

/* -------------------------------------------------------------------------- */
/*                              PUBLIC PROP TYPES                             */
/* -------------------------------------------------------------------------- */

export type WorkflowNodeIcon =
  | 'user'
  | 'users'
  | 'code'
  | 'folder'
  | 'database'
  | 'rocket'
  | 'globe'
  | 'activity'
  | 'chart'
  | 'brain'
  | 'crosshair'
  | 'eye'
  | 'report'
  | 'gauge'
  | 'key'
  | 'click'
  | 'play'
  | 'shield'
  | 'target'
  | 'trend'

export type WorkflowNodeItem = {
  id: string

  type: 'group' | 'icon' | 'request' | 'browser'

  position: {
    x: number
    y: number
  }

  label?: string

  color?: WorkflowColor

  icon?: WorkflowNodeIcon

  /**
   * Add this when the node should live inside a group.
   */
  parentId?: string

  /**
   * Group dimensions.
   */
  width?: number
  height?: number

  /**
   * Prevent child from leaving its group.
   */
  restrictToParent?: boolean
}

export type WorkflowConnection = {
  id?: string

  source: string
  target: string

  sourceHandle?: string
  targetHandle?: string

  type?: 'bezier' | 'straight' | 'step' | 'smoothstep'

  animated?: boolean
}

type WorkFlowProps = {
  nodes: WorkflowNodeItem[]
  connections: WorkflowConnection[]

  height?: number | string

  className?: string
  title: string
  description: string
}

/* -------------------------------------------------------------------------- */
/*                              INTERNAL TYPES                                */
/* -------------------------------------------------------------------------- */

type ArchitectureNodeData = {
  variant: 'icon' | 'request' | 'browser'

  label?: string

  color?: WorkflowColor

  icon?: WorkflowNodeIcon
}

type GroupNodeData = {
  label: string
  color: WorkflowColor
}

/* -------------------------------------------------------------------------- */
/*                              CORNER HANDLES                                */
/* -------------------------------------------------------------------------- */

const CornerHandles = ({ color }: { color: string }) => {
  const base = 'pointer-events-none absolute z-20 size-[7px] border bg-input'

  return (
    <>
      <span
        className={`${base} -top-1 -left-1`}
        style={{ borderColor: color }}
      />

      <span
        className={`${base} -top-1 -right-1`}
        style={{ borderColor: color }}
      />

      <span
        className={`${base} -bottom-1 -left-1`}
        style={{ borderColor: color }}
      />

      <span
        className={`${base} -right-1 -bottom-1`}
        style={{ borderColor: color }}
      />
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*                                 GROUP NODE                                 */
/* -------------------------------------------------------------------------- */

const GroupNode = ({ data }: NodeProps<Node<GroupNodeData>>) => {
  const color = getColor(data.color)

  return (
    <div
      className="relative size-full border bg-transparent"
      style={{
        borderColor: color,
      }}
    >
      <CornerHandles color={color} />

      <div
        className="pointer-events-none absolute -top-4 left-1/2 z-30 -translate-x-1/2 -translate-y-1/2 px-1.75 font-mono text-[14px] leading-none whitespace-nowrap"
        style={{
          color,
        }}
      >
        {data.label}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                           ARCHITECTURE NODE                                */
/* -------------------------------------------------------------------------- */

const ArchitectureNode = ({ data }: NodeProps<Node<ArchitectureNodeData>>) => {
  const color = getColor(data.color)

  const iconMap: Record<WorkflowNodeIcon, LucideIcon> = {
    user: UserRound,
    users: UsersRound,
    code: CodeXml,
    folder: Folder,
    database: Database,
    rocket: Rocket,
    globe: Globe2,
    activity: Activity,
    chart: BarChart3,
    brain: Brain,
    crosshair: Crosshair,
    eye: Eye,
    report: FileBarChart,
    gauge: Gauge,
    key: KeyRound,
    click: MousePointerClick,
    play: Play,
    shield: ShieldCheck,
    target: Target,
    trend: TrendingUp,
  }

  const Icon = iconMap[data.icon ?? 'code']

  /* ------------------------------------------------------------------------ */
  /*                               REQUEST                                    */
  /* ------------------------------------------------------------------------ */

  if (data.variant === 'request') {
    return (
      <div className="relative h-28 w-48.5 rounded-[18px] border border-dashed px-4.5 py-4.5">
        <Handle
          type="target"
          position={Position.Left}
          className="size-2.5! border!"
        />

        <div className="space-y-2.75 font-mono text-[13px] font-medium text-[#858585]">
          <div>
            <span className="text-[#c9c9c9]">GET</span> <span>/products</span>
          </div>

          <div>
            <span className="text-[#a4a4a4]">POST</span>{' '}
            <span>/users/profile</span>
          </div>

          <div>
            <span className="text-[#a4a4a4]">POST</span> <span>/order</span>
          </div>
        </div>

        <Handle
          type="source"
          position={Position.Right}
          className="size-2.5! border!"
        />
      </div>
    )
  }

  /* ------------------------------------------------------------------------ */
  /*                               BROWSER                                    */
  /* ------------------------------------------------------------------------ */

  if (data.variant === 'browser') {
    return (
      <div className="bg-background relative h-53.75 w-90 overflow-hidden rounded-[12px] border-2">
        <Handle
          type="target"
          position={Position.Left}
          className="size-1! border-0! bg-transparent!"
        />

        <div className="flex h-8 items-center gap-2 border-b-2 px-3.75">
          <div className="flex h-full items-center gap-1">
            <span className="size-2.75 rounded-full bg-red-400" />
            <span className="size-2.75 rounded-full bg-yellow-400" />
            <span className="size-2.75 rounded-full bg-green-400" />
          </div>

          <div className="ml-2 flex h-6 min-w-24 items-center gap-1 rounded-md border-2 pl-1">
            <img src="/logo.png" className="size-4 dark:invert" alt="" />
            <p className="text-muted-foreground text-xs">Pathlens</p>
          </div>
        </div>

        <div className="space-y-2.5 px-4.5 pt-7">
          <div className="h-15.75 rounded-[7px] border-2 border-dashed" />

          <div className="h-7.5 rounded-[7px] border-2 border-dashed" />

          <div className="h-7.5 rounded-[7px] border-2 border-dashed" />
        </div>
      </div>
    )
  }

  /* ------------------------------------------------------------------------ */
  /*                                  ICON                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="relative">
      {data.label && (
        <div
          className="pointer-events-none absolute -top-6.75 left-1/2 -translate-x-1/2 font-mono text-[13px] whitespace-nowrap"
          style={{
            color,
          }}
        >
          {data.label}
        </div>
      )}

      <div
        className="relative flex size-14.5 items-center justify-center border p-2"
        style={{
          borderColor: color,
        }}
      >
        <CornerHandles color={color} />

        <div
          className="flex size-full items-center justify-center border border-dashed"
          style={{
            borderColor: `${color}cc`,
            backgroundColor: `${color}08`,
          }}
        >
          <Icon
            className="size-6.75"
            strokeWidth={1.65}
            style={{
              color,
            }}
          />
        </div>

        <Handle
          type="target"
          position={Position.Left}
          className="size-1! border-0! bg-transparent!"
        />

        <Handle
          type="source"
          position={Position.Right}
          className="size-1! border-0! bg-transparent!"
        />

        <Handle
          id="top"
          type="target"
          position={Position.Top}
          className="size-1! border-0! bg-transparent!"
        />

        <Handle
          id="bottom"
          type="source"
          position={Position.Bottom}
          className="size-1! border-0! bg-transparent!"
        />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                  TYPES                                     */
/* -------------------------------------------------------------------------- */

const nodeTypes = {
  architecture: ArchitectureNode,
  groupNode: GroupNode,
}

/* -------------------------------------------------------------------------- */
/*                                EDGE STYLE                                  */
/* -------------------------------------------------------------------------- */

const edgeStyle = {
  stroke: 'color-mix(var(--color-foreground) 50%, transparent)',
  strokeWidth: 1.35,
  strokeDasharray: '6 6',
  opacity: 0.82,
}

/* -------------------------------------------------------------------------- */
/*                          CONVERT PROP -> FLOW NODE                         */
/* -------------------------------------------------------------------------- */

const createFlowNodes = (items: WorkflowNodeItem[]): Node[] => {
  /*
   * Parent nodes MUST come before children in React Flow.
   */
  const sortedItems = [
    ...items.filter((item) => item.type === 'group'),
    ...items.filter((item) => item.type !== 'group'),
  ]

  return sortedItems.map((item) => {
    /* ---------------------------------------------------------------------- */
    /*                                GROUP                                   */
    /* ---------------------------------------------------------------------- */

    if (item.type === 'group') {
      return {
        id: item.id,

        type: 'groupNode',

        position: item.position,

        data: {
          label: item.label ?? '',
          color: item.color ?? 'blue',
        },

        style: {
          width: item.width ?? 100,
          height: item.height ?? 150,
          background: 'transparent',
          border: 'none',
          overflow: 'visible',
        },
      }
    }

    /* ---------------------------------------------------------------------- */
    /*                            NORMAL NODE                                  */
    /* ---------------------------------------------------------------------- */

    return {
      id: item.id,

      type: 'architecture',

      position: item.position,

      parentId: item.parentId,

      extent:
        item.parentId && item.restrictToParent !== false ? 'parent' : undefined,

      data: {
        variant: item.type,
        label: item.label,
        color: item.color,
        icon: item.icon,
      },
    }
  })
}

/* -------------------------------------------------------------------------- */
/*                         CONVERT PROP -> FLOW EDGE                          */
/* -------------------------------------------------------------------------- */

const createFlowEdges = (connections: WorkflowConnection[]): Edge[] => {
  return connections.map((connection, index) => ({
    id: connection.id ?? `${connection.source}-${connection.target}-${index}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    type: connection.type ?? 'bezier',
    animated: true,
    style: edgeStyle,
  }))
}

/* -------------------------------------------------------------------------- */
/*                                COMPONENT                                   */
/* -------------------------------------------------------------------------- */

export const WorkFlow = ({
  nodes: nodesData,
  connections,
  height = 560,
  className = '',
  title,
  description,
}: WorkFlowProps) => {
  const convertedNodes = useMemo(() => createFlowNodes(nodesData), [nodesData])

  const convertedEdges = useMemo(
    () => createFlowEdges(connections),
    [connections]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(convertedNodes)

  const [edges, setEdges, onEdgesChange] = useEdgesState(convertedEdges)

  /*
   * If node data from parent changes,
   * update React Flow.
   */
  useEffect(() => {
    setNodes(convertedNodes)
  }, [convertedNodes, setNodes])

  /*
   * If connections from parent change,
   * update React Flow.
   */
  useEffect(() => {
    setEdges(convertedEdges)
  }, [convertedEdges, setEdges])

  return (
    <div className="space-y-20">
      <div className="space-y-2">
        <p className="mx-auto w-fit text-4xl font-medium">{title}</p>

        <p className="text-muted-foreground text-center">{description}</p>
      </div>

      <div
        className={`nut-all relative w-full border border-y-2 ${className}`}
        style={{
          height,
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesReconnectable={false}
          elementsSelectable
          panOnDrag
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          minZoom={1}
          maxZoom={1}
          preventScrolling={false}
          proOptions={{
            hideAttribution: true,
          }}
          defaultViewport={{
            x: 0,
            y: 0,
            zoom: 1,
          }}
        >
          <Background
            color="var(--color-border)"
            bgColor="color-mix(in srgb, var(--color-input) 20%, transparent)"
            size={2}
            gap={20}
          />
        </ReactFlow>
      </div>
    </div>
  )
}
