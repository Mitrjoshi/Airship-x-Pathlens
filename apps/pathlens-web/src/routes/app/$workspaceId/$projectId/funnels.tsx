import { useCreateFunnel, useDeleteFunnel } from '@/mutations/funnels'
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

  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedFunnel, setSelectedFunnel] = useState<{
    id: string
    name: string
  } | null>(null)

  const {
    data: funnelsData,
    refetch,
    dataUpdatedAt,
    isRefetching,
    isLoading,
  } = useQuery(
    getFunnelsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
      range: '7d',
      domain: undefined,
    })
  )

  const { data: domainsData, isLoading: domainsLoading } = useQuery(
    getProjectDomainsOptions(projectId)
  )

  const funnels = funnelsData?.data
  const domains = domainsData?.data
  const activeDomain = domain || domains?.[0]?.domain || ''

  const lastUpdated = useRelativeTime(dataUpdatedAt)

  const { mutate: createFunnel, isPending: createFormPending } =
    useCreateFunnel()

  const { mutate: deleteFunnel, isPending: deleteFunnelPending } =
    useDeleteFunnel()

  const form = useForm<FunnelFormValues>({
    defaultValues: {
      workspace_id: workspaceId,
      project_id: projectId,
      name: '',
      description: null,
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

          <div className="flex items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm">
              Last updated {lastUpdated ? lastUpdated : '-'}
            </p>
          </div>
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
            disabled={isRefetching}
            onClick={() => {
              refetch()
            }}
            variant="outline"
          >
            <RefreshCcwIcon
              className={`${isRefetching ? 'animate-spin' : ''}`}
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

      <div className="mx-auto space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-medium">Funnels</p>

            <p className="text-muted-foreground text-sm">
              Track user journeys, analyze conversion rates, and identify where
              visitors drop off.
            </p>
          </div>

          {/* Create Funnel Dialog */}
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger
              render={
                <Button>
                  <PlusIcon />
                  Create Funnel
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
                        field.state.meta.isTouched && !field.state.meta.isValid

                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Name</FieldLabel>

                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Checkout funnel"
                            autoComplete="off"
                          />

                          <FieldDescription>
                            Give your funnel a name that clearly describes the
                            user journey.
                          </FieldDescription>

                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
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
                        field.state.meta.isTouched && !field.state.meta.isValid

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
                  <form.Field name="steps">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid

                      return (
                        <FieldGroup>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <FieldLabel>Steps</FieldLabel>

                              <FieldDescription>
                                Define the pages or actions users need to
                                complete.
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
                                      onClick={() => field.removeValue(index)}
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
                                        stepNameField.state.meta.isTouched &&
                                        !stepNameField.state.meta.isValid

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
                                              errors={
                                                stepNameField.state.meta.errors
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
                                        targetField.state.meta.isTouched &&
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
                                            value={targetField.state.value}
                                            onBlur={targetField.handleBlur}
                                            onChange={(e) =>
                                              targetField.handleChange(
                                                e.target.value
                                              )
                                            }
                                            aria-invalid={isInvalid}
                                            placeholder="/checkout"
                                          />

                                          <FieldDescription>
                                            The URL path or target to match.
                                          </FieldDescription>

                                          {isInvalid && (
                                            <FieldError
                                              errors={
                                                targetField.state.meta.errors
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
                            <FieldError errors={field.state.meta.errors} />
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
          <div className="grid grid-cols-3 gap-2">
            {isLoading
              ? [...Array(3)].map((_, index) => (
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
                ))
              : funnels?.map((item, index) => (
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
                          <DropdownMenuItem>Edit</DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(item)}
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
                          const firstStepVisitors = item.steps[0]?.visitors ?? 0

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
                                value={Math.min(100, Math.max(0, progress))}
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
        </div>
      </div>

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

          <DialogFooter className="py-2">
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
