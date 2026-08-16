import { PlanLimitNotice } from '@/components/common/plan-gate'
import { ModeToggle } from '@/components/common/mode-toggle'
import { getPlanDefinition, useWorkspacePlan } from '@/lib/billing'
import { useCreateProject } from '@/mutations/projects'
import { getWorkspacesOptions } from '@/queries/workspace'
import { Button } from '@workspace/ui/components/button'
import { CardDescription, CardTitle } from '@workspace/ui/components/card'
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
  Code2,
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

function ProjectPreview({ draft, step }: { draft: ProjectDraft; step: 1 | 2 }) {
  const selectedCount = trackingOptions.filter(
    (option) => draft[option.name]
  ).length
  const displayName = draft.name.trim() || 'Your new project'
  const displayDomain = draft.domain.trim() || 'your-site.com'

  return (
    <aside className="relative isolate order-2 flex min-h-[34rem] overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 text-white lg:order-1 lg:h-screen lg:min-h-0">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-[-8rem] size-[30rem] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-40 left-[-10rem] size-[32rem] rounded-full bg-violet-500/25 blur-3xl" />
        <div className="absolute inset-0 [background-image:linear-gradient(oklch(1_0_0/0.1)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.1)_1px,transparent_1px)] [background-size:40px_40px] opacity-30" />
      </div>

      <div className="relative z-10 flex h-full flex-col px-5 py-8 sm:px-8 sm:py-10 lg:px-14 lg:py-8">
        <Link
          to="/"
          className="flex w-fit items-center gap-2.5 font-semibold tracking-tight"
        >
          <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/20">
            <img
              src="/logo.png"
              alt="PathLens"
              className="landing-logo landing-logo-dark size-full object-contain"
            />
          </span>
          PathLens
        </Link>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8">
          <div className="flex items-center gap-2 text-[10px] font-medium tracking-[0.18em] text-cyan-200/80 uppercase">
            <span className="size-1.5 animate-pulse rounded-full bg-cyan-300" />
            Live project preview
          </div>
          <h2 className="mt-5 text-3xl leading-tight font-semibold tracking-[-0.05em] sm:text-4xl">
            See what you are about to connect.
          </h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-blue-100/65">
            Your choices become the starting point for a focused analytics
            setup. You can refine them later from project settings.
          </p>

          <div className="relative mt-8 overflow-hidden rounded-2xl border border-white/15 bg-slate-950/60 shadow-2xl shadow-black/30 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-white/90">
                    {displayName}
                  </p>
                  <p className="truncate text-[10px] text-white/45">
                    {displayDomain}
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Ready to connect
              </span>
            </div>

            <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
              <div className="px-3 py-4">
                <p className="text-[10px] text-white/45 uppercase">Step</p>
                <p className="mt-1 text-xl font-semibold">0{step}</p>
                <p className="mt-1 text-[10px] text-cyan-200/70">of 02</p>
              </div>
              <div className="px-3 py-4">
                <p className="text-[10px] text-white/45 uppercase">Signals</p>
                <p className="mt-1 text-xl font-semibold">
                  {selectedCount + 1}
                </p>
                <p className="mt-1 text-[10px] text-cyan-200/70">selected</p>
              </div>
              <div className="px-3 py-4">
                <p className="text-[10px] text-white/45 uppercase">Status</p>
                <p className="mt-1 text-xl font-semibold">Live</p>
                <p className="mt-1 text-[10px] text-emerald-300">
                  when installed
                </p>
              </div>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              <div className="flex items-center gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/5 p-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan-300 text-slate-950">
                  <Code2 className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium">Install the tracker</p>
                  <p className="mt-0.5 truncate text-[10px] text-white/45">
                    Add one snippet to {displayDomain}
                  </p>
                </div>
                <Check className="size-4 text-cyan-200" />
              </div>

              {trackingOptions.map((option) => {
                const Icon = option.icon
                const isSelected = draft[option.name]

                return (
                  <div
                    key={option.name}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                      isSelected
                        ? 'border-violet-300/25 bg-violet-300/10'
                        : 'border-white/10 bg-white/5 opacity-60'
                    }`}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium">{option.label}</p>
                      <p className="mt-0.5 truncate text-[10px] text-white/45">
                        {isSelected
                          ? 'Included in this setup'
                          : 'Can be enabled later'}
                      </p>
                    </div>
                    <span
                      className={`size-2 rounded-full ${
                        isSelected ? 'bg-emerald-300' : 'bg-white/25'
                      }`}
                    />
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-2 border-t border-white/10 px-4 py-3 text-[10px] text-white/50 sm:px-5">
              <ShieldCheck className="size-3.5 text-emerald-300" />
              Privacy-conscious collection stays in your control.
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Globe2, label: 'Connect a site' },
              { icon: MousePointerClick, label: 'See real behavior' },
              { icon: Sparkles, label: 'Find the signal' },
            ].map((item) => {
              const Icon = item.icon

              return (
                <div
                  key={item.label}
                  className="flex items-center gap-2 text-[10px] text-blue-100/60"
                >
                  <Icon className="size-3.5 text-cyan-200/80" />
                  {item.label}
                </div>
              )
            })}
          </div>
        </div>
        <p className="text-xs text-blue-100/40">Analytics with intent.</p>
      </div>
    </aside>
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

  return (
    <main className="bg-background flex min-h-screen flex-col lg:grid lg:h-screen lg:min-h-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(30rem,0.95fr)]">
      <section className="order-1 flex min-h-screen flex-col lg:order-2 lg:h-screen lg:min-h-0 lg:overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link
            to="/app/$workspace"
            params={{ workspace }}
            className="flex items-center gap-2 text-sm font-medium lg:hidden"
          >
            <span className="bg-background ring-foreground/10 size-7 overflow-hidden rounded-md ring-1">
              <img
                src="/logo.png"
                alt="PathLens"
                className="landing-logo size-full object-contain"
              />
            </span>
            PathLens
          </Link>
          <Link
            to="/app/$workspace"
            params={{ workspace }}
            className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 text-xs transition-colors lg:flex"
          >
            <ArrowLeft className="size-3.5" />
            Back to projects
          </Link>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-muted-foreground hidden text-xs sm:inline">
              Project setup
            </span>
            <ModeToggle />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-start overflow-y-auto px-5 py-8 sm:px-8 sm:py-12 lg:items-center lg:px-10 lg:py-6">
          <div className="mx-auto w-full max-w-xl">
            {projectLimitReached && projectLimit !== null && (
              <PlanLimitNotice
                workspaceId={workspace}
                resource="project"
                limit={projectLimit}
              />
            )}

            <form
              className="flex min-h-full flex-col"
              onSubmit={(event) => {
                event.preventDefault()
                form.handleSubmit()
              }}
            >
              <div className="flex-1">
                <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium tracking-[0.18em] uppercase">
                  <span className="bg-foreground size-1.5 rounded-full" />
                  New project
                </div>
                <CardTitle className="mt-4 text-3xl tracking-[-0.05em] sm:text-4xl">
                  Set up your signal.
                </CardTitle>
                <CardDescription className="mt-3 max-w-lg text-sm leading-6">
                  Tell us what you are connecting, then choose the context you
                  want to see from day one.
                </CardDescription>

                <div
                  className="mt-8 flex items-center gap-3"
                  aria-label="Creation steps"
                >
                  {[1, 2].map((item) => {
                    const isActive = item === step
                    const isComplete = item < step

                    return (
                      <div
                        key={item}
                        className="flex flex-1 items-center gap-2"
                      >
                        <span
                          className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                            isActive
                              ? 'border-foreground bg-foreground text-background'
                              : isComplete
                                ? 'border-foreground/30 bg-muted text-foreground'
                                : 'text-muted-foreground'
                          }`}
                        >
                          {isComplete ? <Check className="size-3.5" /> : item}
                        </span>
                        <span
                          className={`text-xs ${
                            isActive
                              ? 'text-foreground font-medium'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {item === 1 ? 'Basics' : 'Data points'}
                        </span>
                        {item === 1 && (
                          <span className="bg-border ml-1 h-px flex-1" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {step === 1 ? (
                  <div className="mt-10">
                    <div className="mb-6">
                      <p className="text-sm font-medium">
                        Start with the basics
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        You can update these details later from project
                        settings.
                      </p>
                    </div>

                    <FieldGroup className="gap-5">
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
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
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
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
                                aria-invalid={isInvalid}
                                placeholder="https://yourwebsite.com"
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
                  <div className="mt-10">
                    <div className="mb-6">
                      <p className="text-sm font-medium">
                        Choose your starting signal
                      </p>
                      <p className="text-muted-foreground mt-1 text-sm">
                        Core page views and events are always on. These controls
                        add deeper context to your setup.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {trackingOptions.map((option) => {
                        const Icon = option.icon

                        return (
                          <form.Field key={option.name} name={option.name}>
                            {(field) => (
                              <div
                                className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
                                  field.state.value
                                    ? 'border-foreground/30 bg-muted/20'
                                    : ''
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                                    <Icon className="size-5" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">
                                      {option.label}
                                    </p>
                                    <p className="text-muted-foreground mt-1 text-sm leading-5">
                                      {option.description}
                                    </p>
                                    <p className="text-muted-foreground/80 mt-2 text-xs">
                                      {option.detail}
                                    </p>
                                  </div>
                                  <Switch
                                    checked={field.state.value}
                                    onCheckedChange={field.handleChange}
                                    aria-label={`Enable ${option.label}`}
                                  />
                                </div>
                              </div>
                            )}
                          </form.Field>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
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
              </div>
            </form>
          </div>
        </div>
        <footer className="border-border shrink-0 border-t px-5 py-4 sm:px-8 lg:px-10">
          <p className="text-muted-foreground text-center text-xs lg:text-left">
            Copyright 2026 PathLens - Privacy-first analytics.
          </p>
        </footer>
      </section>

      <ProjectPreview draft={draft} step={step} />
    </main>
  )
}
