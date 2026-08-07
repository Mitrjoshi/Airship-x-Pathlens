import { AppLayout } from '@/components/common/app-layout'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'

import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeftIcon, PlusIcon, SettingsIcon } from 'lucide-react'
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
import { ProjectCard } from './-components/project-card'

export const Route = createFileRoute('/app/$workspace/projects/')({
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
      createProject({
        name: value.title,
        description: value.description,
        domain: value.url,
        workspace_id: workspace,
      })
    },
  })

  const projects = data?.data ?? []
  const firstProject = projects[0]
  const currentWorkspace = workspaceData?.data.find(
    (item) => item.id === workspace
  )
  const canCreateProject =
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes('projects.create')

  return (
    <AppLayout className="mx-auto min-h-screen w-full max-w-5xl gap-0 px-5 py-8 sm:px-8">
      <div className="flex items-center justify-between border-b pb-6">
        <Button
          render={<Link to="/app" />}
          variant="ghost"

          className="-ml-2"
        >
          <ArrowLeftIcon />
          Workspaces
        </Button>
      </div>

      <div className="flex flex-col gap-8 pt-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
              Workspace projects
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Projects
            </h1>
            <p className="text-muted-foreground mt-3 max-w-lg text-sm leading-6">
              Keep your sites together and see their most important signals at a
              glance.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {firstProject && (
              <Button
                variant="outline"

                render={
                  <Link
                    to="/app/$workspace/projects/$project/workspace-settings"
                    params={{ workspace, project: firstProject.id }}
                  />
                }
              >
                <SettingsIcon />
                Workspace settings
              </Button>
            )}

            <Dialog>
              <DialogTrigger
                render={
                  <Button disabled={!canCreateProject}>
                    <PlusIcon />
                    New project
                  </Button>
                }
              />
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
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
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
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
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
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
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
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
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
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
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
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
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
                    <LoadingSwap isLoading={isPending}>
                      Create project
                    </LoadingSwap>
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex items-center justify-between border-b pb-3">
          <p className="text-muted-foreground text-xs">All projects</p>
          {!projectsLoading && !projectsError && (
            <p className="text-muted-foreground text-xs">
              {projects.length} {projects.length === 1 ? 'project' : 'projects'}
            </p>
          )}
        </div>

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
                className="bg-card flex items-center gap-4 rounded-xl border p-4 sm:p-5"
              >
                <Skeleton className="size-2 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="hidden h-8 w-44 sm:block" />
                <Skeleton className="size-4" />
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
    </AppLayout>
  )
}
