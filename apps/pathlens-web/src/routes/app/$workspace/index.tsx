import { PageLayout } from '@/components/common/page-layout'
import { PlanLimitNotice } from '@/components/common/plan-gate'
import {
  ProjectPageHeader,
  SectionHeader,
} from '@/components/common/project-page'
import { getPlanDefinition, useWorkspacePlan } from '@/lib/billing'
import { getProjectsOptions } from '@/queries/projects'
import { getWorkspacesOptions } from '@/queries/workspace'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import { ProjectCard } from './projects/-components/project-card'

export const Route = createFileRoute('/app/$workspace/')({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Projects',
  },
})

function RouteComponent() {
  const { workspace } = Route.useParams()
  const { data: workspaceData } = useQuery(getWorkspacesOptions())
  const {
    data,
    isPending: projectsLoading,
    isError: projectsError,
  } = useQuery(
    getProjectsOptions({
      workspace_id: workspace,
    })
  )

  const currentWorkspace = workspaceData?.data.find(
    (item) => item.id === workspace
  )
  const currentPlanId = useWorkspacePlan(workspace)
  const currentPlan = getPlanDefinition(currentPlanId)
  const projectLimit = currentPlan.limits.projects
  const hasProjectCapacity =
    projectLimit === null ||
    Boolean(currentWorkspace && currentWorkspace.projectCount < projectLimit)
  const canCreateProject =
    (currentWorkspace?.role === 'owner' ||
      currentWorkspace?.permissions.includes('projects.create')) &&
    hasProjectCapacity
  const projectLimitReached =
    currentWorkspace !== undefined &&
    projectLimit !== null &&
    currentWorkspace.projectCount >= projectLimit
  const projects = data?.data ?? []

  return (
    <PageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Workspace projects"
          title="Projects"
          description="Keep your sites together and see their most important signals at a glance."
          actions={
            <Button
              disabled={!canCreateProject}
              render={
                <Link
                  to="/app/$workspace/projects/new"
                  params={{ workspace }}
                />
              }
            >
              <PlusIcon />
              New project
            </Button>
          }
        />

        {projectLimitReached && projectLimit !== null && (
          <PlanLimitNotice
            workspaceId={workspace}
            resource="project"
            limit={projectLimit}
          />
        )}

        <SectionHeader
          title="All projects"
          action={
            !projectsLoading && !projectsError ? (
              <span className="text-muted-foreground text-xs">
                {projects.length}{' '}
                {projects.length === 1 ? 'project' : 'projects'}
              </span>
            ) : undefined
          }
        />

        {projectsError ? (
          <div
            role="alert"
            className="text-destructive rounded-xl border border-dashed px-5 py-10 text-center text-sm"
          >
            Unable to load your projects. Please try again.
          </div>
        ) : projectsLoading ? (
          <div className="space-y-3" aria-label="Loading projects">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="bg-card grid gap-4 rounded-xl border p-4 sm:grid-cols-[13rem_minmax(0,1fr)_minmax(18rem,auto)] sm:items-center sm:p-5"
              >
                <Skeleton className="aspect-video w-full rounded-lg" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-full sm:w-44" />
              </div>
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                workspace={workspace}
                project={project}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed px-5 py-12 text-center">
            <p className="text-sm font-medium">No projects yet</p>
            <p className="text-muted-foreground mt-2 text-sm">
              Create your first project to start seeing analytics here.
            </p>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
