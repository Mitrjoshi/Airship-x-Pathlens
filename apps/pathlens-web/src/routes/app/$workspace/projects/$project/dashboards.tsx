import {
  ProjectPageHeader,
  ProjectPageLayout,
  SectionHeader,
} from '@/components/common/project-page'
import { useCreateDashboard, useDeleteDashboard } from '@/mutations/dashboards'
import { getDashboardsOptions } from '@/queries/dashboards'
import { getWorkspacesOptions } from '@/queries/workspace'
import { Button } from '@workspace/ui/components/button'
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
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
import { Skeleton } from '@workspace/ui/components/skeleton'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { BarChart3, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/dashboards'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Dashboards',
  },
})

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const navigate = useNavigate()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')

  const { data, isPending, isError } = useQuery(
    getDashboardsOptions({
      workspace_id: workspace,
      project_id: project,
    })
  )
  const { data: workspaceData } = useQuery(getWorkspacesOptions())
  const createDashboard = useCreateDashboard()
  const deleteDashboard = useDeleteDashboard()
  const currentWorkspace = workspaceData?.data.find(
    (item) => item.id === workspace
  )
  const canManage =
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes('analytics.dashboard.manage')
  const dashboards = data?.data ?? []

  const openCreateDialog = () => {
    setName('')
    setDescription('')
    setFormError('')
    setCreateOpen(true)
  }

  const handleCreate = () => {
    const trimmedName = name.trim()

    if (!trimmedName) {
      setFormError('Enter a dashboard name.')
      return
    }

    createDashboard.mutate(
      {
        workspace_id: workspace,
        project_id: project,
        name: trimmedName,
        description: description.trim() || null,
      },
      {
        onSuccess: (result) => {
          const dashboardId = result.data?.id

          if (!dashboardId) return

          setCreateOpen(false)
          void navigate({
            to: '/app/$workspace/projects/$project/dashboards/$dashboard',
            params: {
              workspace,
              project,
              dashboard: dashboardId,
            },
          })
        },
      }
    )
  }

  const confirmDelete = () => {
    if (!deleteId) return

    deleteDashboard.mutate(
      {
        id: deleteId,
        workspace_id: workspace,
        project_id: project,
      },
      {
        onSuccess: () => {
          setDeleteId(null)
          setDeleteName('')
        },
      }
    )
  }

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Workspace intelligence"
          title="Custom dashboards"
          description="Build a focused view of the signals your team checks most often."
          actions={
            <Button onClick={openCreateDialog} disabled={!canManage}>
              <Plus />
              New dashboard
            </Button>
          }
        />

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="w-full max-w-md">
            <DialogHeader>
              <DialogTitle>Create a dashboard</DialogTitle>
              <DialogDescription>
                Start with a blank canvas and add the widgets your team needs.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="dashboard-name">Name</Label>
                <Input
                  id="dashboard-name"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setFormError('')
                  }}
                  placeholder="Weekly growth review"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dashboard-description">
                  Description <span className="font-normal">(optional)</span>
                </Label>
                <Input
                  id="dashboard-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="The signals we discuss every Monday"
                />
              </div>
              {formError && (
                <p className="text-destructive text-sm">{formError}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createDashboard.isPending}
              >
                {createDashboard.isPending ? 'Creating...' : 'Create dashboard'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={deleteId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteId(null)
              setDeleteName('')
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this dashboard?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove "{deleteName}" and all of its widgets.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmDelete}
              >
                Delete dashboard
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <SectionHeader
          title="Your dashboards"
          action={
            !isPending && !isError ? (
              <span className="text-muted-foreground text-xs">
                {dashboards.length}{' '}
                {dashboards.length === 1 ? 'dashboard' : 'dashboards'}
              </span>
            ) : undefined
          }
        />

        {isError ? (
          <div className="text-destructive rounded-xl border border-dashed px-5 py-12 text-center text-sm">
            Unable to load custom dashboards. Please try again.
          </div>
        ) : isPending ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : dashboards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {dashboards.map((dashboard) => (
              <Card key={dashboard.id} className="group flex flex-col">
                <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                  <Link
                    to="/app/$workspace/projects/$project/dashboards/$dashboard"
                    params={{
                      workspace,
                      project,
                      dashboard: dashboard.id,
                    }}
                    className="min-w-0"
                  >
                    <CardTitle className="group-hover:text-primary truncate text-base transition-colors">
                      {dashboard.name}
                    </CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">
                      {dashboard.description || 'No description'}
                    </CardDescription>
                  </Link>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={`Delete ${dashboard.name}`}
                      onClick={() => {
                        setDeleteId(dashboard.id)
                        setDeleteName(dashboard.name)
                      }}
                    >
                      <Trash2 className="text-muted-foreground size-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between gap-3">
                  <div className="text-muted-foreground flex items-center gap-2 text-xs">
                    <BarChart3 className="size-4" />
                    {dashboard.widgetCount}{' '}
                    {dashboard.widgetCount === 1 ? 'widget' : 'widgets'}
                  </div>
                  <Link
                    to="/app/$workspace/projects/$project/dashboards/$dashboard"
                    params={{
                      workspace,
                      project,
                      dashboard: dashboard.id,
                    }}
                    className="text-primary text-xs font-medium hover:underline"
                  >
                    Open dashboard
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
              <div className="bg-muted mb-4 rounded-full p-3">
                <BarChart3 className="text-muted-foreground size-6" />
              </div>
              <p className="font-medium">No custom dashboards yet</p>
              <p className="text-muted-foreground mt-2 max-w-md text-sm">
                Create a dashboard for a weekly review, launch watch, or any
                other view your team wants to keep close.
              </p>
              <Button
                className="mt-5"
                onClick={openCreateDialog}
                disabled={!canManage}
              >
                <Plus />
                Create your first dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </ProjectPageLayout>
  )
}
