import { WorkspacePageLayout } from '@/components/app-sidebar'
import { PlanLimitNotice } from '@/components/common/plan-gate'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { createFileRoute } from '@tanstack/react-router'
import { PlusIcon } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupText,
  InputGroupTextarea,
} from '@workspace/ui/components/input-group'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { useCreateProject } from '@/mutations/projects'
import { useQuery } from '@tanstack/react-query'
import { getProjectsOptions } from '@/queries/projects'
import { getWorkspacesOptions } from '@/queries/workspace'
import { getPlanDefinition, useWorkspacePlan } from '@/lib/billing'
import { ProjectCard } from './projects/-components/project-card'
import {
  ProjectPageHeader,
  SectionHeader,
} from '@/components/common/project-page'

export const Route = createFileRoute('/app/$workspace/')({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Projects',
  },
})

const formSchema = z.object({
  title: z.string().min(2).max(32),
  description: z.string().max(100),
  url: z.url(),
})

function RouteComponent() {
  const { mutate: createProject, isPending } = useCreateProject()
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

  const form = useForm({
    defaultValues: {
      title: '',
      description: '',
      url: 'http://localhost:5173',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: ({ value }) => {
      if (!canCreateProject) return

      createProject({
        name: value.title,
        description: value.description,
        domain: value.url,
        workspace_id: workspace,
      })
    },
  })

  const projects = data?.data ?? []

  return (
    <WorkspacePageLayout workspaceId={workspace}>
      <div className="space-y-8">
        <Dialog>
          <ProjectPageHeader
            eyebrow="Workspace projects"
            title="Projects"
            description="Keep your sites together and see their most important signals at
                a glance."
            actions={
              <DialogTrigger
                render={
                  <Button disabled={!canCreateProject}>
                    <PlusIcon />
                    New project
                  </Button>
                }
              />
            }
          />
          {projectLimitReached && projectLimit !== null && (
            <PlanLimitNotice
              workspaceId={workspace}
              resource="project"
              limit={projectLimit}
            />
          )}
          <DialogContent className="w-full max-w-md">
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>
                Connect a site to start collecting analytics.
              </DialogDescription>
            </DialogHeader>

            <form
              id="create-project-form"
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <FieldGroup>
                <form.Field
                  name="title"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Project name
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Marketing site"
                          autoComplete="off"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                />
                <form.Field
                  name="url"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Website URL
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="http://localhost:5173"
                          autoComplete="url"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                />
                <form.Field
                  name="description"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Description{' '}
                          <span className="text-muted-foreground font-normal">
                            (optional)
                          </span>
                        </FieldLabel>
                        <InputGroup className="max-h-40">
                          <InputGroupTextarea
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="What are you tracking?"
                            rows={4}
                            className="min-h-20 resize-none"
                            aria-invalid={isInvalid}
                          />
                          <InputGroupAddon align="block-end">
                            <InputGroupText className="ml-auto tabular-nums">
                              {field.state.value.length}/100
                            </InputGroupText>
                          </InputGroupAddon>
                        </InputGroup>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                />
              </FieldGroup>
            </form>
            <DialogFooter>
              <Button
                type="submit"
                form="create-project-form"
                disabled={isPending}
              >
                <LoadingSwap isLoading={isPending}>Create project</LoadingSwap>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
    </WorkspacePageLayout>
  )
}
