import {
  ProjectPageHeader,
  ProjectPageLayout,
  PageToolbar,
} from '@/components/common/project-page'
import {
  DashboardGrid,
  type DashboardWidgetInteractionProps,
} from '@/components/dashboards/dashboard-grid'
import { DashboardWidgetCard } from '@/components/dashboards/dashboard-widget'
import { WidgetBuilderDialog } from '@/components/dashboards/widget-builder-dialog'
import {
  useCreateDashboardWidget,
  useDeleteDashboardWidget,
  useUpdateDashboard,
  useUpdateDashboardWidget,
} from '@/mutations/dashboards'
import {
  getDashboardOptions,
  type DashboardDevice,
  type DashboardRange,
} from '@/queries/dashboards'
import { getWorkspacesOptions } from '@/queries/workspace'
import type {
  DashboardWidget,
  DashboardWidgetConfig,
  DashboardWidgetLayout,
} from '@workspace/contracts'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent } from '@workspace/ui/components/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/dashboards/$dashboard'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Custom Dashboard',
  },
})

function layoutsEqual(
  first: DashboardWidgetLayout,
  second: DashboardWidgetLayout
): boolean {
  return (
    first.x === second.x &&
    first.y === second.y &&
    first.w === second.w &&
    first.h === second.h
  )
}

function RouteComponent() {
  const { workspace, project, dashboard: dashboardId } = Route.useParams()
  const [range, setRange] = useState<DashboardRange>('30d')
  const [device, setDevice] = useState<DashboardDevice>('all')
  const [layoutOverrides, setLayoutOverrides] = useState<
    Record<string, DashboardWidgetLayout>
  >({})
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<DashboardWidget>()
  const [deleteWidget, setDeleteWidget] = useState<DashboardWidget>()
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const { data, isPending, isError } = useQuery(
    getDashboardOptions({
      workspace_id: workspace,
      project_id: project,
      dashboard_id: dashboardId,
    })
  )
  const { data: workspaceData } = useQuery(getWorkspacesOptions())
  const createWidget = useCreateDashboardWidget()
  const updateWidget = useUpdateDashboardWidget()
  const deleteWidgetMutation = useDeleteDashboardWidget()
  const updateDashboard = useUpdateDashboard()
  const dashboard = data?.data
  const currentWorkspace = workspaceData?.data.find(
    (item) => item.id === workspace
  )
  const canManage =
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes('analytics.dashboard.manage')

  const scope = {
    workspace_id: workspace,
    project_id: project,
  }

  const openAddWidget = () => {
    setEditingWidget(undefined)
    setBuilderOpen(true)
  }

  const openEditWidget = (widget: DashboardWidget) => {
    setEditingWidget(widget)
    setBuilderOpen(true)
  }

  const handleWidgetSubmit = (value: {
    title: string | null
    config: DashboardWidgetConfig
  }) => {
    if (editingWidget) {
      updateWidget.mutate(
        {
          dashboardId,
          widgetId: editingWidget.id,
          payload: {
            ...scope,
            title: value.title,
            config: value.config,
          },
        },
        {
          onSuccess: () => {
            setBuilderOpen(false)
            setEditingWidget(undefined)
          },
        }
      )
      return
    }

    createWidget.mutate(
      {
        dashboardId,
        payload: {
          ...scope,
          title: value.title,
          config: value.config,
        },
      },
      {
        onSuccess: () => setBuilderOpen(false),
      }
    )
  }

  const handleLayoutChange = (
    layouts: Record<string, DashboardWidgetLayout>
  ) => {
    setLayoutOverrides((current) => ({ ...current, ...layouts }))

    for (const widget of dashboard?.widgets ?? []) {
      const layout = layouts[widget.id]

      if (!layout || layoutsEqual(widget.layout, layout)) continue

      updateWidget.mutate({
        dashboardId,
        widgetId: widget.id,
        payload: {
          ...scope,
          layout,
        },
      })
    }
  }

  const openDetails = () => {
    if (!dashboard) return

    setName(dashboard.name)
    setDescription(dashboard.description ?? '')
    setDetailsOpen(true)
  }

  const saveDetails = () => {
    const trimmedName = name.trim()

    if (!trimmedName) return

    updateDashboard.mutate(
      {
        id: dashboardId,
        payload: {
          ...scope,
          name: trimmedName,
          description: description.trim() || null,
        },
      },
      {
        onSuccess: () => setDetailsOpen(false),
      }
    )
  }

  const confirmDeleteWidget = () => {
    if (!deleteWidget) return

    deleteWidgetMutation.mutate(
      {
        dashboardId,
        widgetId: deleteWidget.id,
        ...scope,
      },
      {
        onSuccess: () => setDeleteWidget(undefined),
      }
    )
  }

  const renderWidget = (
    widget: DashboardWidget,
    interaction: DashboardWidgetInteractionProps
  ) => (
    <DashboardWidgetCard
      widget={widget}
      scope={scope}
      range={range}
      device={device}
      canManage={Boolean(canManage)}
      interaction={interaction}
      onEdit={() => openEditWidget(widget)}
      onDelete={() => setDeleteWidget(widget)}
    />
  )

  if (isPending) {
    return (
      <ProjectPageLayout>
        <div className="space-y-8">
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </ProjectPageLayout>
    )
  }

  if (isError || !dashboard) {
    return (
      <ProjectPageLayout>
        <Card>
          <CardContent className="flex min-h-72 flex-col items-center justify-center gap-4 text-center">
            <p className="text-destructive text-sm">
              Unable to load this dashboard.
            </p>
            <Button
              render={
                <Link
                  to="/app/$workspace/projects/$project/dashboards"
                  params={{ workspace, project }}
                />
              }
              variant="outline"
            >
              <ArrowLeft />
              Back to dashboards
            </Button>
          </CardContent>
        </Card>
      </ProjectPageLayout>
    )
  }

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Custom dashboard"
          title={dashboard.name}
          description={
            dashboard.description || 'A focused view of your project signals.'
          }
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {canManage && (
                <Button variant="outline" onClick={openDetails}>
                  <Pencil />
                  Edit details
                </Button>
              )}
              <Button onClick={openAddWidget} disabled={!canManage}>
                <Plus />
                Add widget
              </Button>
            </div>
          }
        />

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="w-full max-w-md">
            <DialogHeader>
              <DialogTitle>Edit dashboard</DialogTitle>
              <DialogDescription>
                Keep the name and description clear for everyone using this
                view.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="dashboard-detail-name">Name</Label>
                <Input
                  id="dashboard-detail-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard-detail-description">
                  Description
                </Label>
                <Input
                  id="dashboard-detail-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={saveDetails}
                disabled={updateDashboard.isPending}
              >
                {updateDashboard.isPending ? 'Saving...' : 'Save changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <WidgetBuilderDialog
          open={builderOpen}
          onOpenChange={(open) => {
            setBuilderOpen(open)
            if (!open) setEditingWidget(undefined)
          }}
          scope={scope}
          range={range}
          editingWidget={editingWidget}
          onSubmit={handleWidgetSubmit}
          isSubmitting={createWidget.isPending || updateWidget.isPending}
        />

        <AlertDialog
          open={Boolean(deleteWidget)}
          onOpenChange={(open) => {
            if (!open) setDeleteWidget(undefined)
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove this widget?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the widget from the dashboard. Its source data is
                not affected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmDeleteWidget}
              >
                Remove widget
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <PageToolbar className="justify-between">
          <p className="text-muted-foreground text-xs">
            {canManage
              ? 'Drag the grip to rearrange widgets. Use the corner handle to resize.'
              : 'Read-only view'}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={range}
              onValueChange={(value) => setRange(value as DashboardRange)}
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
              onValueChange={(value) => setDevice(value as DashboardDevice)}
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
          </div>
        </PageToolbar>

        {(dashboard.widgets ?? []).length > 0 ? (
          <DashboardGrid
            widgets={dashboard.widgets.map((widget) => ({
              ...widget,
              layout: layoutOverrides[widget.id] ?? widget.layout,
            }))}
            onLayoutChange={handleLayoutChange}
            renderWidget={renderWidget}
          />
        ) : (
          <Card>
            <CardContent className="flex min-h-80 flex-col items-center justify-center px-5 text-center">
              <div className="bg-muted mb-4 rounded-full p-3">
                <Plus className="text-muted-foreground size-6" />
              </div>
              <p className="font-medium">This dashboard is empty</p>
              <p className="text-muted-foreground mt-2 max-w-md text-sm">
                Add a metric, chart, funnel, table, heatmap, conversion, or
                retention widget to make it useful.
              </p>
              <Button
                className="mt-5"
                onClick={openAddWidget}
                disabled={!canManage}
              >
                <Plus />
                Add your first widget
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ProjectPageLayout>
  )
}
