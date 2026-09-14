import {
  PageHeader,
  PageLayout,
  SectionHeader,
} from '@/components/common/page-layout'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { getWorkspacesOptions } from '@/queries/workspace'
import { useCreateWorkspace } from '@/mutations/workspace'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import {
  ArrowUpRightIcon,
  BuildingIcon,
  FolderIcon,
  PlusIcon,
  UsersIcon,
} from 'lucide-react'
import { formatNumber } from '@/utils/utils'

export const Route = createFileRoute('/app/')({
  component: RouteComponent,
})

function RouteComponent() {
  const [isCreating, setIsCreating] = useState(false)
  const [workspaceName, setWorkspaceName] = useState('')
  const createWorkspace = useCreateWorkspace()
  const { data, isPending, isError } = useQuery(getWorkspacesOptions())

  const workspaces = data?.data ?? []

  return (
    <PageLayout>
      <PageHeader
        eyebrow="Workspace"
        title="Your workspace."
        description="Open your workspace to see its projects and analytics."
        actions={
          <Button onClick={() => setIsCreating((value) => !value)}>
            <PlusIcon />
            New workspace
          </Button>
        }
      />

      {isCreating && (
        <form
          className="bg-muted/40 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault()
            const name = workspaceName.trim()
            if (!name) return

            createWorkspace.mutate({ name })
          }}
        >
          <label className="flex-1 space-y-2 text-sm font-medium">
            Workspace name
            <Input
              autoFocus
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              placeholder="Acme Analytics"
              maxLength={80}
            />
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createWorkspace.isPending || !workspaceName.trim()}
            >
              {createWorkspace.isPending ? 'Creating...' : 'Create workspace'}
            </Button>
          </div>
        </form>
      )}

      <SectionHeader
        title="Default workspace"
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
          <p className="text-sm font-medium">Default workspace unavailable</p>
          <p className="text-muted-foreground mt-2 text-sm">
            Contact support to restore access to your default workspace.
          </p>
        </div>
      )}
    </PageLayout>
  )
}
