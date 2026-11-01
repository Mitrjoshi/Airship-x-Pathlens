import {
  useCreateFunnel,
  useDeleteFunnel,
  useUpdateFunnel,
} from '@/mutations/funnels'
import { getFunnelsOptions, type FunnelRange } from '@/queries/funnels'
import { getProjectDomainsOptions } from '@/queries/domains'
import { useQuery } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { useState } from 'react'
import { DomainSwitcher } from './-components/common/domain-switcher'
import { Separator } from '@workspace/ui/components/separator'
import { useRelativeTime } from '@/hooks/use-relative-time'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  EllipsisIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RefreshCcwIcon,
  SearchIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  XIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Progress } from '@workspace/ui/components/progress'
import { formatDate } from '@/utils/utils'
import { Badge } from '@workspace/ui/components/badge'
import { cn } from '@workspace/ui'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import { z } from 'zod'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { getWorkspacePermissionsOptions } from '@/queries/workspace'
import { toast } from 'sonner'
import { NoPermissionView } from './-components/common/no-permission-view'
import { ErrorScreen } from './-components/common/error-screen'

export const Route = createFileRoute('/app/$workspaceId/$projectId/funnels')({
  component: RouteComponent,
})

const rangeLabels = [
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
]

const formSchema = z.object({
  workspace_id: z.string(),
  project_id: z.string(),
  name: z.string().min(1, 'Funnel name is required'),
  description: z.string().nullable(),
  steps: z
    .array(
      z.object({
        name: z.string().min(1, 'Step name is required'),
        target: z.string().min(1, 'Target is required'),
      })
    )
    .min(1, 'At least one step is required'),
})

type FunnelFormValues = z.infer<typeof formSchema>

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const rangeLocal = localStorage.getItem('range')

  const [range, setRange] = useState<FunnelRange>(
    (rangeLocal || '7d') as FunnelRange
  )

  const [domain, setDomain] = useState('')
  const [liveMode, setLiveMode] = useState(false)

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingFunnel, setEditingFunnel] = useState<EditableFunnel | null>(
    null
  )

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedFunnel, setSelectedFunnel] = useState<{
    id: string
    name: string
  } | null>(null)

  const {
    data: permissionsData,
    isLoading: permissionsLoading,
    error: permissionsError,
    refetch: refetchPermissions,
    isRefetching: isRefetchingPermissions,
  } = useQuery(getWorkspacePermissionsOptions(workspaceId))

  const permissions = permissionsData?.data
  const hasViewPermission = permissions?.includes('analytics.funnels.view')
  const hasManagePermission = permissions?.includes('analytics.funnels.manage')

  const {
    data: domainsData,
    isLoading: domainsLoading,
    error: domainsError,
    refetch: refetchDomains,
    isRefetching: refetchingDomains,
  } = useQuery({
    ...getProjectDomainsOptions(projectId),
    enabled: !!hasViewPermission,
  })

  const domains = domainsData?.data
  const activeDomain = domain || domains?.[0]?.domain || ''

  const {
    data: funnelsData,
    refetch: refetchFunnels,
    dataUpdatedAt,
    isRefetching: refetchingFunnels,
    isLoading: funnelsLoading,
    error: funnelsError,
  } = useQuery({
    ...getFunnelsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range: '7d',
      domain: activeDomain,
    }),
    enabled: !!hasViewPermission && !!activeDomain,
    refetchInterval: liveMode ? 5000 : undefined,
  })

  const funnels = funnelsData?.data

  const lastUpdated = useRelativeTime(dataUpdatedAt)

  const { mutate: createFunnel, isPending: createFormPending } =
    useCreateFunnel()

  const { mutate: deleteFunnel, isPending: deleteFunnelPending } =
    useDeleteFunnel()

  const globalLoading = permissionsLoading || domainsLoading || funnelsLoading
  const refetch = () =>
    Promise.all([refetchPermissions(), refetchFunnels(), refetchDomains()])
  const globalError = permissionsError || domainsError || funnelsError
  const globalRefetching =
    isRefetchingPermissions || refetchingFunnels || refetchingDomains

  const form = useForm({
    defaultValues: {
      workspace_id: workspaceId,
      project_id: projectId,
      name: '',
      description: '',
      steps: [
        {
          name: '',
          target: '',
        },
      ],
    },

    validators: {
      onSubmit: formSchema,
    },

    onSubmit: async ({ value }) => {
      createFunnel(value, {
        onSuccess: () => {
          setCreateDialogOpen(false)

          form.reset()

          refetch()
        },
      })
    },
  })

  const handleEditClick = (funnel: NonNullable<typeof funnels>[number]) => {
    // Take a snapshot of the selected funnel so its fields initialize together.
    setEditingFunnel({
      id: funnel.id,
      name: funnel.name,
      description: funnel.description ?? null,
      steps: funnel.steps.map((step) => ({
        name: step.name,
        target: step.target ?? '',
      })),
    })
  }

  const handleDeleteClick = (funnel: { id: string; name: string }) => {
    setSelectedFunnel({
      id: funnel.id,
      name: funnel.name,
    })

    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (!selectedFunnel) return

    deleteFunnel(
      {
        id: selectedFunnel.id,
        project_id: projectId,
        workspace_id: workspaceId,
      },
      {
        onSuccess: () => {
          setDeleteDialogOpen(false)
          setSelectedFunnel(null)

          refetch()
        },
      }
    )
  }

  return (
    <div>
      {permissionsLoading ? (
        <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
          <Skeleton className={'h-8 w-60'} />

          <div className="flex items-center gap-2">
            <Skeleton className={'h-8 w-30'} />
            <Skeleton className={'h-8 w-30'} />
            <Skeleton className={'h-8 w-30'} />
          </div>
        </div>
      ) : hasViewPermission ? (
        <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
          <div className="flex items-center gap-4">
            <DomainSwitcher
              loading={domainsLoading}
              domain={activeDomain}
              setDomain={setDomain}
              domains={domains!}
              refetch={refetch}
            />

            <Separator orientation="vertical" />

            {lastUpdated && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-muted-foreground text-sm">
                  Last updated {lastUpdated ? lastUpdated : '-'}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              data-live={liveMode}
              onClick={() => setLiveMode(!liveMode)}
              className="data-[live=true]:bg-primary/20! data-[live=true]:border-primary! data-[live=true]:text-primary! duration-200 data-[live=true]:border-dashed!"
              variant="outline"
            >
              {liveMode ? <PauseIcon /> : <PlayIcon />}
              Live Refresh
            </Button>

            <Button
              disabled={globalRefetching}
              onClick={refetch}
              variant="outline"
            >
              <RefreshCcwIcon
                className={`${globalRefetching ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>

            <Separator orientation="vertical" />

            <Select
              items={rangeLabels}
              value={range}
              onValueChange={(value) => {
                if (!value) return

                setRange(value as FunnelRange)
                localStorage.setItem('range', value)
              }}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>

              <SelectContent alignItemWithTrigger={false}>
                {rangeLabels.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <></>
      )}
      <div className="mx-auto space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-medium">Funnels</p>

            <p className="text-muted-foreground text-sm">
              Track user journeys, analyze conversion rates, and identify where
              visitors drop off.
            </p>
          </div>
        </div>

        {globalError && !globalLoading ? (
          <ErrorScreen
            workspace_id={workspaceId}
            project_id={projectId}
            refetching={globalRefetching}
            refetch={refetch}
          />
        ) : (
          <>
            {!hasViewPermission && !permissionsLoading ? (
              <NoPermissionView />
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <InputGroup className="w-120">
                    <InputGroupButton>
                      <SearchIcon />
                    </InputGroupButton>

                    <InputGroupInput placeholder="Search..." />
                  </InputGroup>

                  {/* Create Funnel Dialog */}
                  <Dialog
                    open={createDialogOpen}
                    onOpenChange={(open) => {
                      if (open && !hasManagePermission) {
                        toast.error(
                          'You do not have permission to create funnels.'
                        )
                        return
                      }

                      setCreateDialogOpen(open)
                    }}
                  >
                    <DialogTrigger
                      render={
                        <Button disabled={globalLoading}>
                          <PlusIcon />
                          New Funnel
                        </Button>
                      }
                    />

                    <DialogContent className="sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Create Funnel</DialogTitle>
                      </DialogHeader>

                      <form
                        className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4"
                        id="create-funnel"
                        onSubmit={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          form.handleSubmit()
                        }}
                      >
                        <FieldGroup>
                          {/* Funnel name */}
                          <form.Field
                            name="name"
                            children={(field) => {
                              const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                              return (
                                <Field data-invalid={isInvalid}>
                                  <FieldLabel htmlFor={field.name}>
                                    Name
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
                                    placeholder="Checkout funnel"
                                    autoComplete="off"
                                  />

                                  <FieldDescription>
                                    Give your funnel a name that clearly
                                    describes the user journey.
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

                          {/* Description */}
                          <form.Field
                            name="description"
                            children={(field) => {
                              const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                              return (
                                <Field data-invalid={isInvalid}>
                                  <FieldLabel htmlFor={field.name}>
                                    Description
                                  </FieldLabel>

                                  <Textarea
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value ?? ''}
                                    onBlur={field.handleBlur}
                                    onChange={(e) =>
                                      field.handleChange(e.target.value)
                                    }
                                    aria-invalid={isInvalid}
                                    placeholder="Track users from landing page to checkout."
                                  />

                                  <FieldDescription>
                                    Optional description for this funnel.
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

                          {/* Steps */}
                          <form.Field name="steps">
                            {(field) => {
                              const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                              return (
                                <FieldGroup>
                                  <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                      <FieldLabel>Steps</FieldLabel>

                                      <FieldDescription>
                                        Define the pages or actions users need
                                        to complete.
                                      </FieldDescription>
                                    </div>

                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        field.pushValue({
                                          name: '',
                                          target: '',
                                        })
                                      }
                                    >
                                      <PlusIcon />
                                      Add step
                                    </Button>
                                  </div>

                                  <div className="space-y-3">
                                    {field.state.value.map((_, index) => (
                                      <div
                                        key={index}
                                        className="rounded-lg border p-3"
                                      >
                                        <div className="mb-3 flex items-center justify-between">
                                          <p className="text-sm font-medium">
                                            Step {index + 1}
                                          </p>

                                          {field.state.value.length > 1 && (
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="size-8"
                                              onClick={() =>
                                                field.removeValue(index)
                                              }
                                            >
                                              <XIcon />
                                              <span className="sr-only">
                                                Remove step
                                              </span>
                                            </Button>
                                          )}
                                        </div>

                                        <div className="grid gap-3">
                                          {/* Step name */}
                                          <form.Field
                                            name={`steps[${index}].name`}
                                            children={(stepNameField) => {
                                              const isInvalid =
                                                stepNameField.state.meta
                                                  .isTouched &&
                                                !stepNameField.state.meta
                                                  .isValid

                                              return (
                                                <Field data-invalid={isInvalid}>
                                                  <FieldLabel
                                                    htmlFor={stepNameField.name}
                                                  >
                                                    Step name
                                                  </FieldLabel>

                                                  <Input
                                                    id={stepNameField.name}
                                                    name={stepNameField.name}
                                                    value={
                                                      stepNameField.state.value
                                                    }
                                                    onBlur={
                                                      stepNameField.handleBlur
                                                    }
                                                    onChange={(e) =>
                                                      stepNameField.handleChange(
                                                        e.target.value
                                                      )
                                                    }
                                                    aria-invalid={isInvalid}
                                                    placeholder="Landing page"
                                                  />

                                                  {isInvalid && (
                                                    <FieldError
                                                      errors={
                                                        stepNameField.state.meta
                                                          .errors
                                                      }
                                                    />
                                                  )}
                                                </Field>
                                              )
                                            }}
                                          />

                                          {/* Step target */}
                                          <form.Field
                                            name={`steps[${index}].target`}
                                            children={(targetField) => {
                                              const isInvalid =
                                                targetField.state.meta
                                                  .isTouched &&
                                                !targetField.state.meta.isValid

                                              return (
                                                <Field data-invalid={isInvalid}>
                                                  <FieldLabel
                                                    htmlFor={targetField.name}
                                                  >
                                                    Target
                                                  </FieldLabel>

                                                  <Input
                                                    id={targetField.name}
                                                    name={targetField.name}
                                                    value={
                                                      targetField.state.value
                                                    }
                                                    onBlur={
                                                      targetField.handleBlur
                                                    }
                                                    onChange={(e) =>
                                                      targetField.handleChange(
                                                        e.target.value
                                                      )
                                                    }
                                                    aria-invalid={isInvalid}
                                                    placeholder="/checkout"
                                                  />

                                                  <FieldDescription>
                                                    The URL path or target to
                                                    match.
                                                  </FieldDescription>

                                                  {isInvalid && (
                                                    <FieldError
                                                      errors={
                                                        targetField.state.meta
                                                          .errors
                                                      }
                                                    />
                                                  )}
                                                </Field>
                                              )
                                            }}
                                          />
                                        </div>
                                      </div>
                                    ))}
                                  </div>

                                  {isInvalid && (
                                    <FieldError
                                      errors={field.state.meta.errors}
                                    />
                                  )}
                                </FieldGroup>
                              )
                            }}
                          </form.Field>
                        </FieldGroup>
                      </form>

                      <DialogFooter className="py-2">
                        <DialogClose>
                          <Button type="button" variant="outline">
                            Cancel
                          </Button>
                        </DialogClose>

                        <Button
                          disabled={createFormPending}
                          type="submit"
                          form="create-funnel"
                        >
                          <LoadingSwap isLoading={createFormPending}>
                            Create
                          </LoadingSwap>
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div>
                  {globalLoading ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[...Array(3)].map((_, index) => (
                        <Card
                          className="bg-card/30 gap-4 rounded-none border-2 border-dashed p-4"
                          key={index}
                        >
                          <CardHeader className="flex items-start justify-between p-0">
                            <div className="min-w-0 space-y-2">
                              <Skeleton className="h-5 w-32" />
                              <Skeleton className="h-4 w-48" />
                            </div>

                            <Skeleton className="size-8" />
                          </CardHeader>

                          <CardContent className="space-y-4 p-0">
                            {/* Conversion Rate */}
                            <div className="flex items-end justify-between">
                              <div className="space-y-2">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-8 w-20" />
                              </div>

                              <Skeleton className="h-6 w-16 rounded-md" />
                            </div>

                            {/* Funnel Steps */}
                            <div className="space-y-3">
                              {[...Array(2)].map((_, stepIndex) => (
                                <div key={stepIndex} className="space-y-1.5">
                                  <div className="flex items-center justify-between gap-3">
                                    <Skeleton className="h-3 w-28" />
                                    <Skeleton className="h-3 w-16" />
                                  </div>

                                  <Skeleton className="h-1.5 w-full" />
                                </div>
                              ))}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between border-t pt-3">
                              <Skeleton className="h-3 w-24" />
                              <Skeleton className="h-3 w-20" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : funnels && funnels.length ? (
                    <div className="grid grid-cols-3 gap-2">
                      {funnels?.map((item, index) => (
                        <Card
                          key={index}
                          className="bg-card/30 gap-4 rounded-none border-2 border-dashed p-4"
                        >
                          <CardHeader className="flex items-start justify-between p-0">
                            <div className="min-w-0 space-y-1">
                              <CardTitle className="flex items-center gap-2">
                                <span className="truncate">{item.name}</span>

                                <span
                                  className={cn(
                                    'flex items-center gap-1 text-xs font-medium',
                                    item.trend === 'up'
                                      ? 'text-green-500'
                                      : item.trend === 'down'
                                        ? 'text-red-500'
                                        : 'text-muted-foreground'
                                  )}
                                >
                                  {item.trend === 'up' ? (
                                    <TrendingUpIcon className="size-3.5" />
                                  ) : item.trend === 'down' ? (
                                    <TrendingDownIcon className="size-3.5" />
                                  ) : (
                                    <MinusIcon className="size-3.5" />
                                  )}

                                  {item.trendValue}
                                </span>
                              </CardTitle>

                              <CardDescription className="line-clamp-2">
                                {item.description || 'No description provided'}
                              </CardDescription>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button size="icon" variant="ghost">
                                    <EllipsisIcon />
                                  </Button>
                                }
                              />

                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (!hasManagePermission) {
                                      toast.error(
                                        'You do not have permission to edit the funnel.'
                                      )
                                      return
                                    }
                                    handleEditClick(item)
                                  }}
                                >
                                  Edit
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => {
                                    if (!hasManagePermission) {
                                      toast.error(
                                        'You do not have permission to delete the funnel.'
                                      )
                                      return
                                    }
                                    handleDeleteClick(item)
                                  }}
                                  variant="destructive"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </CardHeader>

                          <CardContent className="space-y-4 p-0">
                            {/* Conversion Rate */}
                            <div className="flex items-end justify-between">
                              <div>
                                <p className="text-muted-foreground text-xs">
                                  Conversion rate
                                </p>

                                <p className="text-2xl font-semibold tabular-nums">
                                  {item.conversionRate.toFixed(1)}%
                                </p>
                              </div>

                              <Badge variant="secondary">
                                {item.steps.length} steps
                              </Badge>
                            </div>

                            {/* Funnel Steps */}
                            <div className="space-y-3">
                              {item.steps.map((step, stepIndex) => {
                                const firstStepVisitors =
                                  item.steps[0]?.visitors ?? 0

                                const progress =
                                  firstStepVisitors > 0
                                    ? (step.visitors / firstStepVisitors) * 100
                                    : 0

                                return (
                                  <div key={stepIndex} className="space-y-1.5">
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <span className="text-muted-foreground">
                                          {stepIndex + 1}.
                                        </span>

                                        <span className="truncate font-medium">
                                          {step.name}
                                        </span>
                                      </div>

                                      <span className="shrink-0 font-medium tabular-nums">
                                        {step.visitors.toLocaleString()}

                                        <span className="text-muted-foreground ml-1 font-normal">
                                          visitors
                                        </span>
                                      </span>
                                    </div>

                                    <Progress
                                      value={Math.min(
                                        100,
                                        Math.max(0, progress)
                                      )}
                                      className="h-1.5"
                                    />
                                  </div>
                                )
                              })}
                            </div>

                            {/* Footer */}
                            <div className="text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
                              <span>Created {formatDate(item.createdAt)}</span>

                              <span>{item.steps.length} funnel steps</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-80 w-full flex-col items-center justify-center">
                      <p>No funnels found.</p>
                      <p className="text-muted-foreground text-sm">
                        Create your first funnel to get started.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {editingFunnel && (
        <EditFunnelDialog
          key={editingFunnel.id}
          funnel={editingFunnel}
          workspaceId={workspaceId}
          projectId={projectId}
          onClose={() => setEditingFunnel(null)}
          onUpdated={() => {
            setEditingFunnel(null)
            refetch()
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete funnel?</DialogTitle>

            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="text-foreground font-medium">
                {selectedFunnel?.name}
              </span>
              ? This action cannot be undone and all funnel data will be
              permanently removed.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="bg-transparent py-2">
            <DialogClose
              disabled={deleteFunnelPending}
              onClick={() => setSelectedFunnel(null)}
              render={<Button variant={'outline'} />}
            >
              Cancel
            </DialogClose>

            <Button
              variant="destructive"
              disabled={deleteFunnelPending}
              onClick={handleDeleteConfirm}
            >
              <LoadingSwap isLoading={deleteFunnelPending}>
                Delete Funnel
              </LoadingSwap>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Mounting this component with a funnel-specific key gives TanStack Form
// the selected funnel's data as its initial values on every edit.
type EditableFunnel = {
  id: string
  name: string
  description: string | null
  steps: Array<{ name: string; target: string }>
}

type EditFunnelDialogProps = {
  funnel: EditableFunnel
  workspaceId: string
  projectId: string
  onClose: () => void
  onUpdated: () => void
}

function EditFunnelDialog({
  funnel,
  workspaceId,
  projectId,
  onClose,
  onUpdated,
}: EditFunnelDialogProps) {
  const { mutate: updateFunnel, isPending: updateFormPending } =
    useUpdateFunnel()
  const editForm = useForm({
    defaultValues: {
      workspace_id: workspaceId,
      project_id: projectId,
      name: funnel.name,
      description: funnel.description,
      steps: funnel.steps.map((step) => ({
        name: step.name,
        target: step.target,
      })),
    } as FunnelFormValues,

    validators: { onSubmit: formSchema },
    onSubmit: async ({ value }) => {
      updateFunnel(
        {
          id: funnel.id,
          payload: value,
        },
        { onSuccess: onUpdated }
      )
    },
  })

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !updateFormPending) onClose()
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Funnel</DialogTitle>
        </DialogHeader>

        <form
          className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4"
          id="edit-funnel"
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            editForm.handleSubmit()
          }}
        >
          <FieldGroup>
            {/* Funnel name */}
            <editForm.Field
              name="name"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={`edit-${field.name}`}>Name</FieldLabel>

                    <Input
                      id={`edit-${field.name}`}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      placeholder="Checkout funnel"
                      autoComplete="off"
                    />

                    <FieldDescription>
                      Give your funnel a name that clearly describes the user
                      journey.
                    </FieldDescription>

                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />

            {/* Description */}
            <editForm.Field
              name="description"
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={`edit-${field.name}`}>
                      Description
                    </FieldLabel>

                    <Textarea
                      id={`edit-${field.name}`}
                      name={field.name}
                      value={field.state.value ?? ''}
                      onBlur={field.handleBlur}
                      onChange={(e) =>
                        field.handleChange(e.target.value || null)
                      }
                      aria-invalid={isInvalid}
                      placeholder="Track users from landing page to checkout."
                    />

                    <FieldDescription>
                      Optional description for this funnel.
                    </FieldDescription>

                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />

            {/* Steps */}
            <editForm.Field name="steps">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <FieldGroup>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <FieldLabel>Steps</FieldLabel>

                        <FieldDescription>
                          Define the pages or actions users need to complete.
                        </FieldDescription>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          field.pushValue({
                            name: '',
                            target: '',
                          })
                        }
                      >
                        <PlusIcon />
                        Add step
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {field.state.value.map((_, index) => (
                        <div key={index} className="rounded-lg border p-3">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-sm font-medium">
                              Step {index + 1}
                            </p>

                            {field.state.value.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8"
                                onClick={() => field.removeValue(index)}
                              >
                                <XIcon />
                                <span className="sr-only">Remove step</span>
                              </Button>
                            )}
                          </div>

                          <div className="grid gap-3">
                            {/* Step name */}
                            <editForm.Field
                              name={`steps[${index}].name`}
                              children={(stepNameField) => {
                                const isInvalid =
                                  stepNameField.state.meta.isTouched &&
                                  !stepNameField.state.meta.isValid

                                return (
                                  <Field data-invalid={isInvalid}>
                                    <FieldLabel
                                      htmlFor={`edit-${stepNameField.name}`}
                                    >
                                      Step name
                                    </FieldLabel>

                                    <Input
                                      id={`edit-${stepNameField.name}`}
                                      name={stepNameField.name}
                                      value={stepNameField.state.value}
                                      onBlur={stepNameField.handleBlur}
                                      onChange={(e) =>
                                        stepNameField.handleChange(
                                          e.target.value
                                        )
                                      }
                                      aria-invalid={isInvalid}
                                      placeholder="Landing page"
                                    />

                                    {isInvalid && (
                                      <FieldError
                                        errors={stepNameField.state.meta.errors}
                                      />
                                    )}
                                  </Field>
                                )
                              }}
                            />

                            {/* Step target */}
                            <editForm.Field
                              name={`steps[${index}].target`}
                              children={(targetField) => {
                                const isInvalid =
                                  targetField.state.meta.isTouched &&
                                  !targetField.state.meta.isValid

                                return (
                                  <Field data-invalid={isInvalid}>
                                    <FieldLabel
                                      htmlFor={`edit-${targetField.name}`}
                                    >
                                      Target
                                    </FieldLabel>

                                    <Input
                                      id={`edit-${targetField.name}`}
                                      name={targetField.name}
                                      value={targetField.state.value}
                                      onBlur={targetField.handleBlur}
                                      onChange={(e) =>
                                        targetField.handleChange(e.target.value)
                                      }
                                      aria-invalid={isInvalid}
                                      placeholder="/checkout"
                                    />

                                    <FieldDescription>
                                      The URL path or target to match.
                                    </FieldDescription>

                                    {isInvalid && (
                                      <FieldError
                                        errors={targetField.state.meta.errors}
                                      />
                                    )}
                                  </Field>
                                )
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </FieldGroup>
                )
              }}
            </editForm.Field>
          </FieldGroup>
        </form>

        <DialogFooter className="bg-transparent py-2">
          <Button
            type="button"
            variant="outline"
            disabled={updateFormPending}
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button disabled={updateFormPending} type="submit" form="edit-funnel">
            <LoadingSwap isLoading={updateFormPending}>
              Save Changes
            </LoadingSwap>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
