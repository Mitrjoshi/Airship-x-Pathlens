import { getFunnelsOptions, type FunnelRange } from '@/queries/funnels'
import { getGoalsOptions, type GoalRange } from '@/queries/goals'
import { getHeatmapsOptions } from '@/queries/heatmaps'
import type { DashboardScope } from '@/queries/dashboards'
import type {
  DashboardRange,
  DashboardWidget,
  DashboardWidgetConfig,
  DashboardWidgetType,
} from '@workspace/contracts'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  BarChart3,
  ChartColumnIncreasing,
  CirclePercent,
  Filter,
  LayoutGrid,
  MousePointer2,
  Table2,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

interface WidgetBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scope: DashboardScope
  range: DashboardRange
  editingWidget?: DashboardWidget
  onSubmit: (value: {
    title: string | null
    config: DashboardWidgetConfig
  }) => void
  isSubmitting?: boolean
}

const widgetOptions: {
  type: DashboardWidgetType
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    type: 'metric',
    label: 'Metric',
    description: 'A single number with context.',
    icon: LayoutGrid,
  },
  {
    type: 'line',
    label: 'Line chart',
    description: 'Track visitors or sessions over time.',
    icon: ChartColumnIncreasing,
  },
  {
    type: 'bar',
    label: 'Bar chart',
    description: 'Compare an audience breakdown.',
    icon: BarChart3,
  },
  {
    type: 'funnel',
    label: 'Funnel',
    description: 'Show progression through a saved funnel.',
    icon: Filter,
  },
  {
    type: 'table',
    label: 'Table',
    description: 'Rank pages, sources, or browsers.',
    icon: Table2,
  },
  {
    type: 'heatmap',
    label: 'Heatmap',
    description: 'Surface click or scroll concentration.',
    icon: MousePointer2,
  },
  {
    type: 'conversion',
    label: 'Conversion',
    description: 'Monitor global, funnel, or goal progress.',
    icon: CirclePercent,
  },
  {
    type: 'retention',
    label: 'Retention',
    description: 'Read visitor cohorts over time.',
    icon: UsersRound,
  },
]

function getFunnelRange(range: DashboardRange): FunnelRange {
  return range
}

function getGoalRange(range: DashboardRange): GoalRange {
  return range
}

interface WidgetBuilderState {
  type: DashboardWidgetType
  title: string
  metric:
    | 'visitors'
    | 'sessions'
    | 'pageViews'
    | 'events'
    | 'avgSessionDuration'
    | 'conversionRate'
    | 'liveVisitors'
  lineMetric: 'visitors' | 'sessions'
  barDimension: 'devices' | 'referrers' | 'countries' | 'browsers'
  funnelId: string
  tableSource: 'pages' | 'referrers' | 'countries' | 'browsers'
  tableLimit: string
  heatmapPath: string
  heatmapMode: 'clicks' | 'scroll'
  conversionMode: 'global' | 'funnel' | 'goal'
  goalId: string
  retentionInterval: 'day' | 'week'
  retentionPeriods: string
}

function getDefaultState(): WidgetBuilderState {
  return {
    type: 'metric',
    title: '',
    metric: 'visitors',
    lineMetric: 'visitors',
    barDimension: 'devices',
    funnelId: '',
    tableSource: 'pages',
    tableLimit: '5',
    heatmapPath: '',
    heatmapMode: 'clicks',
    conversionMode: 'global',
    goalId: '',
    retentionInterval: 'week',
    retentionPeriods: '8',
  }
}

function getInitialState(editingWidget?: DashboardWidget): WidgetBuilderState {
  const defaults = getDefaultState()
  const config = editingWidget?.config

  if (!config) return defaults

  return {
    ...defaults,
    type: config.type,
    title: editingWidget.title ?? '',
    ...(config.type === 'metric' ? { metric: config.metric } : {}),
    ...(config.type === 'line' ? { lineMetric: config.metric } : {}),
    ...(config.type === 'bar' ? { barDimension: config.dimension } : {}),
    ...(config.type === 'funnel' ? { funnelId: config.funnelId } : {}),
    ...(config.type === 'table'
      ? { tableSource: config.source, tableLimit: String(config.limit) }
      : {}),
    ...(config.type === 'heatmap'
      ? {
          heatmapPath: config.pagePath ?? '',
          heatmapMode: config.mode,
        }
      : {}),
    ...(config.type === 'conversion'
      ? {
          conversionMode: config.mode,
          funnelId: config.funnelId ?? '',
          goalId: config.goalId ?? '',
        }
      : {}),
    ...(config.type === 'retention'
      ? {
          retentionInterval: config.interval,
          retentionPeriods: String(config.periods),
        }
      : {}),
  }
}

function WidgetBuilderDialogContent({
  open,
  onOpenChange,
  scope,
  range,
  editingWidget,
  onSubmit,
  isSubmitting = false,
}: WidgetBuilderDialogProps) {
  const [state, setState] = useState(() => getInitialState(editingWidget))
  const [error, setError] = useState('')

  const { data: funnelsData } = useQuery(
    getFunnelsOptions({
      ...scope,
      range: getFunnelRange(range),
    })
  )
  const { data: goalsData } = useQuery(
    getGoalsOptions({
      ...scope,
      range: getGoalRange(range),
    })
  )
  const { data: heatmapsData } = useQuery(
    getHeatmapsOptions({
      ...scope,
      range,
    })
  )

  const submit = () => {
    let config: DashboardWidgetConfig

    if (state.type === 'metric') {
      config = { type: 'metric', metric: state.metric }
    } else if (state.type === 'line') {
      config = { type: 'line', metric: state.lineMetric }
    } else if (state.type === 'bar') {
      config = { type: 'bar', dimension: state.barDimension }
    } else if (state.type === 'funnel') {
      if (!state.funnelId) {
        setError('Choose a funnel first.')
        return
      }
      config = { type: 'funnel', funnelId: state.funnelId }
    } else if (state.type === 'table') {
      config = {
        type: 'table',
        source: state.tableSource,
        limit: Number(state.tableLimit),
      }
    } else if (state.type === 'heatmap') {
      config = {
        type: 'heatmap',
        pagePath: state.heatmapPath || undefined,
        mode: state.heatmapMode,
      }
    } else if (state.type === 'conversion') {
      if (state.conversionMode === 'funnel' && !state.funnelId) {
        setError('Choose a funnel first.')
        return
      }
      if (state.conversionMode === 'goal' && !state.goalId) {
        setError('Choose a goal first.')
        return
      }
      config = {
        type: 'conversion',
        mode: state.conversionMode,
        funnelId:
          state.conversionMode === 'funnel' ? state.funnelId : undefined,
        goalId: state.conversionMode === 'goal' ? state.goalId : undefined,
      }
    } else {
      config = {
        type: 'retention',
        interval: state.retentionInterval,
        periods: Number(state.retentionPeriods),
      }
    }

    onSubmit({
      title: state.title.trim() || null,
      config,
    })
  }

  const setValue = <Key extends keyof WidgetBuilderState>(
    key: Key,
    value: WidgetBuilderState[Key] | null
  ) => {
    if (value === null) return

    setState((current) => ({ ...current, [key]: value }))
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-3xl! overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingWidget ? 'Edit widget' : 'Add a widget'}
          </DialogTitle>
          <DialogDescription>
            Choose a preset analytics source and tune how it appears on the
            dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {widgetOptions.map((option) => {
              const Icon = option.icon
              const selected = state.type === option.type

              return (
                <button
                  key={option.type}
                  type="button"
                  className={`rounded-xl border p-3 text-left transition-colors ${selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/60'}`}
                  onClick={() => {
                    setValue('type', option.type)
                    setError('')
                  }}
                >
                  <Icon className="mb-2 size-4" />
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    {option.description}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="widget-title">Widget title</Label>
              <Input
                id="widget-title"
                value={state.title}
                onChange={(event) => setValue('title', event.target.value)}
                placeholder={
                  widgetOptions.find((item) => item.type === state.type)?.label
                }
              />
            </div>

            {state.type === 'metric' && (
              <Select
                value={state.metric}
                onValueChange={(value) =>
                  setValue('metric', value as typeof state.metric)
                }
              >
                <Label>Metric</Label>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visitors">Visitors</SelectItem>
                  <SelectItem value="sessions">Sessions</SelectItem>
                  <SelectItem value="pageViews">Page views</SelectItem>
                  <SelectItem value="events">Events</SelectItem>
                  <SelectItem value="avgSessionDuration">
                    Avg. session duration
                  </SelectItem>
                  <SelectItem value="conversionRate">
                    Conversion rate
                  </SelectItem>
                  <SelectItem value="liveVisitors">Live visitors</SelectItem>
                </SelectContent>
              </Select>
            )}

            {state.type === 'line' && (
              <Select
                value={state.lineMetric}
                onValueChange={(value) =>
                  setValue('lineMetric', value as typeof state.lineMetric)
                }
              >
                <Label>Series</Label>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a series" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visitors">Visitors</SelectItem>
                  <SelectItem value="sessions">Sessions</SelectItem>
                </SelectContent>
              </Select>
            )}

            {state.type === 'bar' && (
              <Select
                value={state.barDimension}
                onValueChange={(value) =>
                  setValue('barDimension', value as typeof state.barDimension)
                }
              >
                <Label>Breakdown</Label>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a breakdown" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="devices">Devices</SelectItem>
                  <SelectItem value="referrers">Referrers</SelectItem>
                  <SelectItem value="countries">Countries</SelectItem>
                  <SelectItem value="browsers">Browsers</SelectItem>
                </SelectContent>
              </Select>
            )}

            {state.type === 'funnel' && (
              <Select
                value={state.funnelId}
                onValueChange={(value) => setValue('funnelId', value)}
              >
                <Label>Funnel</Label>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a funnel" />
                </SelectTrigger>
                <SelectContent>
                  {(funnelsData?.data ?? []).map((funnel) => (
                    <SelectItem key={funnel.id} value={funnel.id}>
                      {funnel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {state.type === 'table' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  value={state.tableSource}
                  onValueChange={(value) =>
                    setValue('tableSource', value as typeof state.tableSource)
                  }
                >
                  <Label>Rows from</Label>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pages">Top pages</SelectItem>
                    <SelectItem value="referrers">Referrers</SelectItem>
                    <SelectItem value="countries">Countries</SelectItem>
                    <SelectItem value="browsers">Browsers</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={state.tableLimit}
                  onValueChange={(value) => setValue('tableLimit', value)}
                >
                  <Label>Rows to show</Label>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a limit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 rows</SelectItem>
                    <SelectItem value="5">5 rows</SelectItem>
                    <SelectItem value="8">8 rows</SelectItem>
                    <SelectItem value="10">10 rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {state.type === 'heatmap' && (
              <div className="space-y-4">
                <Select
                  value={state.heatmapPath || '__top__'}
                  onValueChange={(value) =>
                    setValue('heatmapPath', value === '__top__' ? '' : value)
                  }
                >
                  <Label>Page</Label>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a page" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__top__">Top active page</SelectItem>
                    {(heatmapsData?.data.pages ?? []).map((page) => (
                      <SelectItem key={page.path} value={page.path}>
                        {page.path}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={state.heatmapMode}
                  onValueChange={(value) =>
                    setValue('heatmapMode', value as typeof state.heatmapMode)
                  }
                >
                  <Label>View</Label>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clicks">Click concentration</SelectItem>
                    <SelectItem value="scroll">Scroll depth</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {state.type === 'conversion' && (
              <div className="space-y-4">
                <Select
                  value={state.conversionMode}
                  onValueChange={(value) =>
                    setValue(
                      'conversionMode',
                      value as typeof state.conversionMode
                    )
                  }
                >
                  <Label>Conversion source</Label>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      Global conversion rate
                    </SelectItem>
                    <SelectItem value="funnel">Saved funnel</SelectItem>
                    <SelectItem value="goal">Saved goal</SelectItem>
                  </SelectContent>
                </Select>
                {state.conversionMode === 'funnel' && (
                  <Select
                    value={state.funnelId}
                    onValueChange={(value) => setValue('funnelId', value)}
                  >
                    <Label>Funnel</Label>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a funnel" />
                    </SelectTrigger>
                    <SelectContent>
                      {(funnelsData?.data ?? []).map((funnel) => (
                        <SelectItem key={funnel.id} value={funnel.id}>
                          {funnel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {state.conversionMode === 'goal' && (
                  <Select
                    value={state.goalId}
                    onValueChange={(value) => setValue('goalId', value)}
                  >
                    <Label>Goal</Label>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a goal" />
                    </SelectTrigger>
                    <SelectContent>
                      {(goalsData?.data ?? []).map((goal) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {state.type === 'retention' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  value={state.retentionInterval}
                  onValueChange={(value) =>
                    setValue(
                      'retentionInterval',
                      value as typeof state.retentionInterval
                    )
                  }
                >
                  <Label>Cohort interval</Label>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Daily</SelectItem>
                    <SelectItem value="week">Weekly</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={state.retentionPeriods}
                  onValueChange={(value) => setValue('retentionPeriods', value)}
                >
                  <Label>Periods</Label>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose periods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 periods</SelectItem>
                    <SelectItem value="8">8 periods</SelectItem>
                    <SelectItem value="12">12 periods</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isSubmitting}>
            {isSubmitting
              ? 'Saving...'
              : editingWidget
                ? 'Save widget'
                : 'Add widget'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function WidgetBuilderDialog(props: WidgetBuilderDialogProps) {
  if (!props.open) return null

  return (
    <WidgetBuilderDialogContent
      key={props.editingWidget?.id ?? 'new-widget'}
      {...props}
    />
  )
}
