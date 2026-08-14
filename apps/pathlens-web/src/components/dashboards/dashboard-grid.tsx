import type {
  DashboardWidget,
  DashboardWidgetLayout,
} from '@workspace/contracts'
import type {
  PointerEvent as ReactPointerEvent,
  PointerEventHandler,
  ReactNode,
} from 'react'
import { useEffect, useRef, useState } from 'react'

const GRID_COLUMNS = 12
const GRID_GAP = 16
const GRID_ROW_HEIGHT = 72

type LayoutMap = Record<string, DashboardWidgetLayout>

type Interaction = {
  mode: 'drag' | 'resize'
  id: string
  startX: number
  startY: number
  origin: DashboardWidgetLayout
}

export interface DashboardWidgetInteractionProps {
  dragHandleProps: {
    onPointerDown: PointerEventHandler<HTMLButtonElement>
  }
  resizeHandleProps: {
    onPointerDown: PointerEventHandler<HTMLButtonElement>
  }
}

interface DashboardGridProps {
  widgets: DashboardWidget[]
  onLayoutChange: (layouts: LayoutMap) => void
  renderWidget: (
    widget: DashboardWidget,
    interaction: DashboardWidgetInteractionProps
  ) => ReactNode
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum)
}

function collides(
  first: DashboardWidgetLayout,
  second: DashboardWidgetLayout
): boolean {
  return !(
    first.x + first.w <= second.x ||
    second.x + second.w <= first.x ||
    first.y + first.h <= second.y ||
    second.y + second.h <= first.y
  )
}

function compactLayouts(layouts: LayoutMap, activeId: string): LayoutMap {
  const ordered = Object.entries(layouts).sort(
    ([firstId, first], [secondId, second]) => {
      if (firstId === activeId) return -1
      if (secondId === activeId) return 1
      return first.y - second.y || first.x - second.x
    }
  )
  const placed: DashboardWidgetLayout[] = []
  const result: LayoutMap = {}

  for (const [id, source] of ordered) {
    const layout = { ...source }

    if (id !== activeId) {
      while (placed.some((item) => collides(layout, item))) {
        const colliding = placed.filter((item) => collides(layout, item))
        layout.y = Math.max(...colliding.map((item) => item.y + item.h))
      }
    }

    result[id] = layout
    placed.push(layout)
  }

  return result
}

function getLayouts(widgets: DashboardWidget[]): LayoutMap {
  return Object.fromEntries(widgets.map((widget) => [widget.id, widget.layout]))
}

export function DashboardGrid({
  widgets,
  onLayoutChange,
  renderWidget,
}: DashboardGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draftLayouts, setDraftLayouts] = useState<LayoutMap | null>(null)
  const [interaction, setInteraction] = useState<Interaction | null>(null)
  const layouts = draftLayouts ?? getLayouts(widgets)

  useEffect(() => {
    if (!interaction) return

    const handlePointerMove = (event: PointerEvent) => {
      const container = containerRef.current

      if (!container) return

      const columnWidth =
        (container.clientWidth - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS
      const columnStep = columnWidth + GRID_GAP
      const rowStep = GRID_ROW_HEIGHT + GRID_GAP
      const deltaColumns = Math.round(
        (event.clientX - interaction.startX) / columnStep
      )
      const deltaRows = Math.round(
        (event.clientY - interaction.startY) / rowStep
      )

      setDraftLayouts((current) => {
        const currentLayouts = current ?? getLayouts(widgets)
        const nextLayout =
          interaction.mode === 'drag'
            ? {
                ...interaction.origin,
                x: clamp(
                  interaction.origin.x + deltaColumns,
                  0,
                  GRID_COLUMNS - interaction.origin.w
                ),
                y: Math.max(0, interaction.origin.y + deltaRows),
              }
            : {
                ...interaction.origin,
                w: clamp(
                  interaction.origin.w + deltaColumns,
                  2,
                  GRID_COLUMNS - interaction.origin.x
                ),
                h: clamp(interaction.origin.h + deltaRows, 2, 12),
              }

        return compactLayouts(
          { ...currentLayouts, [interaction.id]: nextLayout },
          interaction.id
        )
      })
    }

    const handlePointerUp = () => {
      setInteraction(null)
      onLayoutChange(draftLayouts ?? getLayouts(widgets))
      setDraftLayouts(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp, { once: true })

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [draftLayouts, interaction, onLayoutChange, widgets])

  const startInteraction = (
    mode: Interaction['mode'],
    id: string,
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault()
    event.stopPropagation()

    const origin = layouts[id]

    if (!origin) return

    setInteraction({
      mode,
      id,
      startX: event.clientX,
      startY: event.clientY,
      origin,
    })
  }

  return (
    <div
      ref={containerRef}
      data-dashboard-grid
      className="grid min-h-32 auto-rows-[72px] grid-cols-12 gap-4"
      style={{
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gridAutoRows: `${GRID_ROW_HEIGHT}px`,
      }}
    >
      <style>{`@media (max-width: 767px) {
  [data-dashboard-grid] [data-dashboard-widget] {
    grid-column: 1 / -1 !important;
    grid-row: auto !important;
  }
}`}</style>
      {widgets.map((widget) => {
        const layout = layouts[widget.id] ?? widget.layout

        return (
          <div
            key={widget.id}
            data-dashboard-widget
            className="relative min-h-0 min-w-0"
            style={{
              gridColumn: `${layout.x + 1} / span ${layout.w}`,
              gridRow: `${layout.y + 1} / span ${layout.h}`,
            }}
          >
            {renderWidget(widget, {
              dragHandleProps: {
                onPointerDown: (event) =>
                  startInteraction('drag', widget.id, event),
              },
              resizeHandleProps: {
                onPointerDown: (event) =>
                  startInteraction('resize', widget.id, event),
              },
            })}
          </div>
        )
      })}
    </div>
  )
}
