import { WorkspacePageLayout } from '@/components/app-sidebar'
import { PlanLimitNotice } from '@/components/common/plan-gate'
import {
  ProjectPageHeader,
  ProjectPanel,
} from '@/components/common/project-page'
import { getPlanDefinition, useWorkspacePlan } from '@/lib/billing'
import { useCreateProject } from '@/mutations/projects'
import { getWorkspacesOptions } from '@/queries/workspace'
import { Button } from '@workspace/ui/components/button'
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Field,
  FieldDescription,
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
import { Switch } from '@workspace/ui/components/switch'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  CirclePlay,
  Globe2,
  MousePointerClick,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/app/$workspace/projects/new')({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'New project',
  },
})

const formSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').max(32),
  domain: z.url('Enter a valid website URL.'),
  description: z.string().max(100),
  captureReplay: z.boolean(),
  capturePerformance: z.boolean(),
  captureErrors: z.boolean(),
})

const stepOneSchema = formSchema.pick({
  name: true,
  domain: true,
  description: true,
})

type ProjectDraft = z.infer<typeof formSchema>

const trackingOptions = [
  {
    name: 'captureReplay' as const,
    label: 'Session Replay',
    description: 'Reconstruct the path visitors take through your site.',
    detail: 'Mask inputs and sensitive text when needed.',
    icon: CirclePlay,
  },
  {
    name: 'capturePerformance' as const,
    label: 'Performance Metrics',
    description: 'Understand how quickly pages load for real visitors.',
    detail: 'Track timing across devices and browsers.',
    icon: Activity,
  },
  {
    name: 'captureErrors' as const,
    label: 'Error Tracking',
    description: 'Capture uncaught errors and rejected promises.',
    detail: 'Find technical friction alongside behavior.',
    icon: TriangleAlert,
  },
] as const

const setupSteps = [
  {
    id: 1,
    title: 'Project details',
    description: 'Name and website',
  },
  {
    id: 2,
    title: 'Data points',
    description: 'Choose what to capture',
  },
] as const

function SetupSteps({ step }: { step: 1 | 2 }) {
  return (
    <div
      className="grid gap-2 sm:grid-cols-2"
      aria-label="Project creation steps"
    >
      {setupSteps.map((item) => {
        const isActive = item.id === step
        const isComplete = item.id < step

        return (
          <div
            key={item.id}
            aria-current={isActive ? 'step' : undefined}
            className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
              isActive
                ? 'border-foreground/25 bg-muted/60'
                : isComplete
                  ? 'border-foreground/15'
                  : 'border-border/70'
            }`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                isActive
                  ? 'border-foreground bg-foreground text-background'
                  : isComplete
                    ? 'border-foreground/25 bg-muted text-foreground'
                    : 'text-muted-foreground'
              }`}
            >
              {isComplete ? <Check className="size-3.5" /> : item.id}
            </span>
            <div className="min-w-0">
              <p
                className={`truncate text-sm ${
                  isActive ? 'font-medium' : 'text-muted-foreground'
                }`}
              >
                {item.title}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {item.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SetupSummary({ draft, step }: { draft: ProjectDraft; step: 1 | 2 }) {
  const selectedCount = trackingOptions.filter(
    (option) => draft[option.name]
  ).length
  const displayName = draft.name.trim() || 'Your new project'
  const displayDomain = draft.domain.trim() || 'your-site.com'
  const isReady =
    draft.name.trim().length >= 2 && draft.domain.trim().length > 0

  return (
    <ProjectPanel className="bg-muted/20 lg:sticky lg:top-6">
      <CardHeader className="border-b px-5 py-5">
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Sparkles className="size-5" />
          </div>
          <div className="min-w-0">
            <CardTitle>Setup preview</CardTitle>
            <CardDescription className="mt-1 leading-5">
              A quick look at what your project will start with.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 p-5">
        <div className="bg-background flex items-center gap-3 rounded-xl border p-3">
          <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Globe2 className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <p className="text-muted-foreground mt-0.5 truncate text-xs">
              {displayDomain}
            </p>
          </div>
          <span
            className={`flex shrink-0 items-center gap-1.5 text-xs ${
              isReady
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-muted-foreground'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                isReady ? 'bg-emerald-500' : 'bg-muted-foreground/50'
              }`}
            />
            {isReady ? 'Ready' : 'Draft'}
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">Setup progress</span>
            <span className="font-medium tabular-nums">0{step} / 02</span>
          </div>
          <div className="bg-muted h-1.5 overflow-hidden rounded-full">
            <div
              className={`bg-primary h-full rounded-full transition-all ${
                step === 1 ? 'w-1/2' : 'w-full'
              }`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
              Signals included
            </p>
            <span className="text-muted-foreground text-xs tabular-nums">
              {selectedCount} optional
            </span>
          </div>

          <div className="bg-background divide-border divide-y overflow-hidden rounded-xl border">
            <div className="flex items-center gap-3 px-3 py-3">
              <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                <MousePointerClick className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">Core analytics</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Page views and standard events
                </p>
              </div>
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>

            {trackingOptions.map((option) => {
              const Icon = option.icon
              const isSelected = draft[option.name]

              return (
                <div
                  key={option.name}
                  className={`flex items-center gap-3 px-3 py-3 transition-colors ${
                    isSelected ? '' : 'opacity-55'
                  }`}
                >
                  <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {isSelected ? 'Enabled at launch' : 'Available later'}
                    </p>
                  </div>
                  {isSelected ? (
                    <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span className="bg-muted-foreground/30 size-1.5 rounded-full" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div className="bg-background flex gap-3 rounded-xl border p-3">
          <ShieldCheck className="text-muted-foreground mt-0.5 size-4 shrink-0" />
          <p className="text-muted-foreground text-xs leading-5">
            Your collection settings stay editable from project settings after
            setup.
          </p>
        </div>
      </CardContent>
    </ProjectPanel>
  )
}

function RouteComponent() {
  const { workspace } = Route.useParams()
  const [step, setStep] = useState<1 | 2>(1)
  const [stepOneAttempted, setStepOneAttempted] = useState(false)
  const { mutate: createProject, isPending } = useCreateProject()
  const { data: workspaceData, isPending: workspacePending } = useQuery(
    getWorkspacesOptions()
  )
  const currentPlanId = useWorkspacePlan(workspace)
  const currentPlan = getPlanDefinition(currentPlanId)
  const currentWorkspace = workspaceData?.data.find(
    (item) => item.id === workspace
  )
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
      name: '',
      domain: 'http://localhost:5173',
      description: '',
      captureReplay: true,
      capturePerformance: true,
      captureErrors: false,
    },
    validators: {
      onChange: formSchema,
    },
    onSubmit: ({ value }) => {
      if (!canCreateProject) return

      createProject({
        name: value.name.trim(),
        description: value.description.trim() || null,
        domain: value.domain.trim(),
        workspace_id: workspace,
        captureReplay: value.captureReplay,
        capturePerformance: value.capturePerformance,
        captureErrors: value.captureErrors,
      })
    },
  })

  const goToNextStep = () => {
    setStepOneAttempted(true)

    if (!stepOneSchema.safeParse(form.state.values).success) return

    setStep(2)
  }

  const draft = form.state.values
  const StepIcon = step === 1 ? Globe2 : Activity

  return (
    <WorkspacePageLayout workspaceId={workspace}>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Workspace projects"
          title="Create a project."
          description="Connect a website and choose the signals you want to collect from day one."
          actions={
            <Button
              variant="outline"
              render={<Link to="/app/$workspace" params={{ workspace }} />}
            >
              <ArrowLeft />
              Back to projects
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

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.18fr)_minmax(19rem,0.82fr)]">
          <ProjectPanel>
            <form
              onSubmit={(event) => {
                event.preventDefault()
                form.handleSubmit()
              }}
            >
              <CardHeader className="border-b px-5 py-5 sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <StepIcon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle>
                      {step === 1
                        ? 'Project details'
                        : 'Choose your data points'}
                    </CardTitle>
                    <CardDescription className="mt-1 leading-5">
                      {step === 1
                        ? 'Give this project a clear identity so your team can find it later.'
                        : 'Start with the signals that will help you understand your visitors.'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-7 p-5 sm:p-6">
                <SetupSteps step={step} />

                {step === 1 ? (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-sm font-medium">
                        Tell us about your site
                      </h2>
                      <p className="text-muted-foreground mt-1 text-sm leading-5">
                        These details can be updated later from project
                        settings.
                      </p>
                    </div>

                    <FieldGroup className="gap-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <form.Field
                          name="name"
                          children={(field) => {
                            const isInvalid =
                              stepOneAttempted && !field.state.meta.isValid

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
                                  onChange={(event) =>
                                    field.handleChange(event.target.value)
                                  }
                                  aria-invalid={isInvalid}
                                  placeholder="Marketing site"
                                  autoComplete="off"
                                  autoFocus
                                />
                                <FieldDescription className="text-xs">
                                  A recognizable name for your team.
                                </FieldDescription>
                                {isInvalid && (
                                  <FieldError
                                    errors={field.state.meta.errors}
                                  />
                                )}
                              </Field>
                            )
                          }}
                        />
                        <form.Field
                          name="domain"
                          children={(field) => {
                            const isInvalid =
                              stepOneAttempted && !field.state.meta.isValid

                            return (
                              <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>
                                  Website domain
                                </FieldLabel>
                                <Input
                                  id={field.name}
                                  name={field.name}
                                  type="url"
                                  value={field.state.value}
                                  onBlur={field.handleBlur}
                                  onChange={(event) =>
                                    field.handleChange(event.target.value)
                                  }
                                  aria-invalid={isInvalid}
                                  placeholder="https://yourwebsite.com"
                                  autoComplete="url"
                                />
                                <FieldDescription className="text-xs">
                                  Include the full protocol, like https://.
                                </FieldDescription>
                                {isInvalid && (
                                  <FieldError
                                    errors={field.state.meta.errors}
                                  />
                                )}
                              </Field>
                            )
                          }}
                        />
                      </div>
                      <form.Field
                        name="description"
                        children={(field) => {
                          const isInvalid =
                            stepOneAttempted && !field.state.meta.isValid

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
                                  onChange={(event) =>
                                    field.handleChange(event.target.value)
                                  }
                                  placeholder="What are you tracking?"
                                  rows={4}
                                  className="min-h-24 resize-none"
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
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-sm font-medium">
                        Choose your starting signal
                      </h2>
                      <p className="text-muted-foreground mt-1 text-sm leading-5">
                        Core page views and events are always on. Add deeper
                        context when you are ready.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {trackingOptions.map((option) => {
                        const Icon = option.icon

                        return (
                          <form.Field key={option.name} name={option.name}>
                            {(field) => {
                              const isEnabled = field.state.value

                              return (
                                <div
                                  className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
                                    isEnabled
                                      ? 'border-foreground/25 bg-muted/30'
                                      : 'border-border/70'
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <span
                                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                                        isEnabled
                                          ? 'bg-primary/10 text-primary'
                                          : 'bg-muted text-muted-foreground'
                                      }`}
                                    >
                                      <Icon className="size-5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="text-sm font-medium">
                                          {option.label}
                                        </p>
                                        <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[10px]">
                                          {isEnabled ? 'Enabled' : 'Optional'}
                                        </span>
                                      </div>
                                      <p className="text-muted-foreground mt-1 text-sm leading-5">
                                        {option.description}
                                      </p>
                                      <p className="text-muted-foreground/80 mt-2 text-xs">
                                        {option.detail}
                                      </p>
                                    </div>
                                    <Switch
                                      checked={isEnabled}
                                      onCheckedChange={field.handleChange}
                                      aria-label={`Enable ${option.label}`}
                                    />
                                  </div>
                                </div>
                              )
                            }}
                          </form.Field>
                        )
                      })}
                    </div>

                    <div className="bg-muted/40 flex gap-3 rounded-xl p-4">
                      <ShieldCheck className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                      <p className="text-muted-foreground text-xs leading-5">
                        Sensitive inputs and text can be masked before you send
                        replay data.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex-col-reverse gap-3 px-5 py-4 sm:flex-row sm:justify-between sm:px-6">
                {step === 1 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    render={
                      <Link to="/app/$workspace" params={{ workspace }} />
                    }
                  >
                    <ArrowLeft />
                    Cancel
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft />
                    Back
                  </Button>
                )}

                {step === 1 ? (
                  <Button type="button" onClick={goToNextStep}>
                    Continue to data points
                    <ArrowRight />
                  </Button>
                ) : (
                  <form.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                  >
                    {([canSubmit, isSubmitting]) => (
                      <Button
                        type="submit"
                        disabled={
                          !canSubmit ||
                          isSubmitting ||
                          isPending ||
                          workspacePending ||
                          !canCreateProject
                        }
                      >
                        <LoadingSwap isLoading={isPending || isSubmitting}>
                          Create project
                        </LoadingSwap>
                        {!isPending && !isSubmitting && <Check />}
                      </Button>
                    )}
                  </form.Subscribe>
                )}
              </CardFooter>
            </form>
          </ProjectPanel>

          <SetupSummary draft={draft} step={step} />
        </div>
      </div>
    </WorkspacePageLayout>
  )
}
