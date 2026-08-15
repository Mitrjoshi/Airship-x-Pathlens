import { AppHeader } from '@/components/common/app-header'
import { PlanLimitNotice } from '@/components/common/plan-gate'
import {
  PageHeader,
  PageLayout,
  SectionHeader,
} from '@/components/common/page-layout'
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
import { Skeleton } from '@workspace/ui/components/skeleton'
import { useCreateWorkspace } from '@/mutations/workspace'
import { getWorkspacesOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouteContext } from '@tanstack/react-router'
import {
  ArrowUpRightIcon,
  BuildingIcon,
  FolderIcon,
  Loader2Icon,
  PlusIcon,
  UsersIcon,
} from 'lucide-react'
import { useState } from 'react'
import { formatNumber } from '@/utils/utils'
import { getPlanDefinition, useWorkspacePlan } from '@/lib/billing'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
})

function RouteComponent() {
  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })
  const { data, isPending, isError } = useQuery(getWorkspacesOptions())
  const createWorkspace = useCreateWorkspace()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')

  const workspaces = data?.data ?? []
  const defaultWorkspaceId = user?.defaultWorkspace?.id ?? ''
  const currentPlanId = useWorkspacePlan(defaultWorkspaceId)
  const currentPlan = getPlanDefinition(currentPlanId)
  const workspaceLimit = currentPlan.limits.workspaces
  const workspaceLimitReached =
    workspaceLimit !== null && workspaces.length >= workspaceLimit
  const canCreateWorkspace = !isPending && !workspaceLimitReached

  return (
    <PageLayout>
      <AppHeader
        user={{
          name: user?.name ?? 'PathLens user',
          email: user?.email ?? '',
          avatar: user?.avatar,
        }}
      />

      <PageHeader
        eyebrow="Workspace"
        title="Choose where to work."
        description="Select a workspace to see its projects and analytics."
        actions={
          <Button
            onClick={() => setIsCreateOpen(true)}
            disabled={!canCreateWorkspace}
          >
            <PlusIcon />
            New workspace
          </Button>
        }
      />

      {workspaceLimitReached &&
        workspaceLimit !== null &&
        defaultWorkspaceId && (
          <PlanLimitNotice
            workspaceId={defaultWorkspaceId}
            resource="workspace"
            limit={workspaceLimit}
          />
        )}

      <SectionHeader
        title="All workspaces"
        action={
          !isPending && !isError ? (
            <span className="text-muted-foreground text-xs">
              {workspaces.length}{' '}
              {workspaces.length === 1 ? 'workspace' : 'workspaces'}
            </span>
          ) : undefined
        }
      />

      {isError ? (
        <div
          role="alert"
          className="text-destructive rounded-xl border border-dashed px-5 py-10 text-center text-sm"
        >
          Unable to load your workspaces. Please try again.
        </div>
      ) : isPending ? (
        <div className="space-y-3" aria-label="Loading workspaces">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="bg-card grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-5 rounded-xl border p-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,auto)_auto] sm:items-center sm:p-5"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:col-span-1 sm:gap-x-5">
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-4 w-8" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-14" />
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>
              <Skeleton className="col-start-2 row-start-1 size-4 justify-self-end sm:col-auto sm:row-auto sm:justify-self-auto" />
            </div>
          ))}
        </div>
      ) : workspaces.length > 0 ? (
        <div className="space-y-3">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              to="/app/$workspace"
              params={{ workspace: workspace.id }}
              className="group focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-3"
            >
              <Card className="group-hover:border-foreground/30 group-hover:bg-muted/20 py-0 transition-colors">
                <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-5 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(12rem,auto)_auto] sm:items-center sm:p-5">
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium">
                      {workspace.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-medium">
                        {workspace.name}
                      </h2>
                      <p className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
                        <BuildingIcon className="size-3.5 shrink-0" />
                        {workspace.isDefault
                          ? 'Default workspace'
                          : 'Workspace'}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:col-span-1 sm:gap-x-5">
                    <div className="min-w-0">
                      <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                        <FolderIcon className="size-3" />
                        <span className="truncate">Projects</span>
                      </p>
                      <p className="mt-1 text-sm font-medium tabular-nums">
                        {formatNumber(workspace.projectCount)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
                        <UsersIcon className="size-3" />
                        <span className="truncate">Members</span>
                      </p>
                      <p className="mt-1 text-sm font-medium tabular-nums">
                        {formatNumber(workspace.memberCount)}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRightIcon className="text-muted-foreground col-start-2 row-start-1 size-4 justify-self-end transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:col-auto sm:row-auto sm:justify-self-auto" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed px-5 py-12 text-center">
          <p className="text-sm font-medium">No workspaces yet</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Create your first workspace to start organizing your projects.
          </p>
        </div>
      )}

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) setWorkspaceName('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a workspace</DialogTitle>
            <DialogDescription>
              Give your team a shared home for projects and analytics.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              const name = workspaceName.trim()

              if (name.length < 2 || !canCreateWorkspace) return

              createWorkspace.mutate(
                { name },
                {
                  onSuccess: () => {
                    setIsCreateOpen(false)
                    setWorkspaceName('')
                  },
                }
              )
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Acme product team"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  workspaceName.trim().length < 2 || createWorkspace.isPending
                }
              >
                {createWorkspace.isPending && (
                  <Loader2Icon className="animate-spin" />
                )}
                Create workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
