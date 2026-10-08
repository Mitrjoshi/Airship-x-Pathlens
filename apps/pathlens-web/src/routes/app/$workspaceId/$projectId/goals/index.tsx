import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  getGoalsOptions,
  type Goal,
  type GoalRange,
  type GoalType,
} from '@/queries/goals'
import { useCreateGoal, useDeleteGoal, useUpdateGoal } from '@/mutations/goals'
import { Button } from '@workspace/ui/components/button'
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
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
} from '@workspace/ui/components/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import {
  CalendarIcon,
  EllipsisIcon,
  MinusIcon,
  PlusIcon,
  SearchIcon,
  TargetIcon,
  TrendingDownIcon,
  TrendingUpIcon,
} from 'lucide-react'
import GoalsLoading from '../-components/common/goals-loading'
import { Calendar } from '@workspace/ui/components/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { formatDate } from '@/utils/utils'
import {
  DotSeparator,
  DotSeparatorItem,
} from '../../../-components/dot-separator'
import { Progress } from '@workspace/ui/components/progress'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'

export const Route = createFileRoute('/app/$workspaceId/$projectId/goals/')({
  component: RouteComponent,
})

export interface GoalPayload {
  workspace_id: string
  project_id: string
  name: string
  type: GoalType
  target: number
  unit: string
  match_target: string
  match_path: string | null
  deadline: string | null
}

const rangeLabels: Record<GoalRange, string> = {
  '24h': 'Last 24 hours',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

const goalTypes = [
  {
    label: 'Event',
    value: 'event',
  },
  {
    label: 'Revenue',
    value: 'revenue',
  },
  {
    label: 'Page View',
    value: 'pageview',
  },
  {
    label: 'Button Click',
    value: 'button',
  },
  {
    label: 'Form Submit',
    value: 'form_submit',
  },
] satisfies Array<{
  label: string
  value: GoalType
}>

const goalTypeMeta: Record<
  GoalType,
  {
    matchLabel: string
    matchPlaceholder: string
    matchDescription: string
    defaultUnit: string
  }
> = {
  event: {
    matchLabel: 'Event Name',
    matchPlaceholder: 'user_signed_up',
    matchDescription: 'Enter the event name Pathlens should match.',
    defaultUnit: 'events',
  },

  revenue: {
    matchLabel: 'Revenue Event',
    matchPlaceholder: 'purchase_completed',
    matchDescription: 'Enter the event that represents a completed purchase.',
    defaultUnit: 'INR',
  },

  pageview: {
    matchLabel: 'Page',
    matchPlaceholder: '/pricing',
    matchDescription: 'Enter the page or URL you want to track.',
    defaultUnit: 'views',
  },

  button: {
    matchLabel: 'Button',
    matchPlaceholder: 'Get Started',
    matchDescription: 'Enter the button identifier or text you want to track.',
    defaultUnit: 'clicks',
  },

  form_submit: {
    matchLabel: 'Form',
    matchPlaceholder: 'signup-form',
    matchDescription: 'Enter the form identifier you want to track.',
    defaultUnit: 'submissions',
  },
}

function RouteComponent() {
  const { projectId, workspaceId } = Route.useParams()

  const [range, setRange] = useState<GoalRange>('7d')
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: goalsData, isLoading: goalsLoading } = useQuery(
    getGoalsOptions({
      project_id: projectId,
      range,
      workspace_id: workspaceId,
    })
  )

  const { mutate: createGoal, isPending } = useCreateGoal()

  const goals = goalsData?.data

  const form = useForm({
    defaultValues: {
      workspace_id: workspaceId,
      project_id: projectId,
      name: '',
      type: 'event' as GoalType,
      target: 100,
      unit: 'events',
      match_target: '',
      match_path: '',
      deadline: '',
    },

    onSubmit: async ({ value }) => {
      const payload: GoalPayload = {
        workspace_id: workspaceId,
        project_id: projectId,
        name: value.name.trim(),
        type: value.type,
        target: Number(value.target),
        unit: value.unit.trim(),
        match_target: value.match_target.trim(),
        match_path: value.match_path?.trim() || null,
        deadline: value.deadline || null,
      }

      createGoal(payload, {
        onSuccess: () => {
          form.reset()
          setDialogOpen(false)
        },
      })
    },
  })

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)

    if (!open && !isPending) {
      form.reset()
    }
  }

  return (
    <div className="p-6">
      <div className="space-y-5">
        {/* Header */}
        <div>
          <p className="text-xl font-medium">Goals</p>

          <p className="text-muted-foreground text-sm">
            Define and manage the key actions you want to track as conversions.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <InputGroup className="w-120">
              <InputGroupButton>
                <SearchIcon />
              </InputGroupButton>

              <InputGroupInput placeholder="Search..." />
            </InputGroup>

            <Select
              value={range}
              onValueChange={(value) => {
                if (value) {
                  setRange(value as GoalRange)
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Date range">
                  {rangeLabels[range]}
                </SelectValue>
              </SelectTrigger>

              <SelectContent alignItemWithTrigger={false}>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Create Goal Dialog */}
          <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger render={<Button />}>
              <PlusIcon />
              New Goal
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Goal</DialogTitle>

                <DialogDescription>
                  Create a measurable goal and define the action Pathlens should
                  track.
                </DialogDescription>
              </DialogHeader>

              <form
                id="create-goal-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  event.stopPropagation()

                  void form.handleSubmit()
                }}
              >
                <FieldGroup>
                  <FieldSet>
                    {/* Name */}
                    <form.Field
                      name="name"
                      validators={{
                        onChange: ({ value }) => {
                          if (!value.trim()) {
                            return 'Goal name is required.'
                          }

                          if (value.trim().length < 2) {
                            return 'Goal name must be at least 2 characters.'
                          }

                          if (value.trim().length > 100) {
                            return 'Goal name must be less than 100 characters.'
                          }

                          return undefined
                        },
                      }}
                    >
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid
                          }
                        >
                          <FieldLabel htmlFor={field.name}>Name</FieldLabel>

                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            placeholder="Sign Up"
                            disabled={isPending}
                            aria-invalid={
                              field.state.meta.isTouched &&
                              !field.state.meta.isValid
                            }
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                          />

                          {field.state.meta.isTouched &&
                            !field.state.meta.isValid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                        </Field>
                      )}
                    </form.Field>

                    {/* Type + Target */}
                    <FieldSet className="grid grid-cols-2 gap-4">
                      {/* Goal Type */}
                      <form.Field name="type">
                        {(field) => (
                          <Field>
                            <FieldLabel>Select Type</FieldLabel>

                            <Select
                              value={field.state.value}
                              disabled={isPending}
                              items={goalTypes}
                              onValueChange={(value) => {
                                if (!value) return

                                const nextType = value as GoalType

                                field.handleChange(nextType)

                                form.setFieldValue(
                                  'unit',
                                  goalTypeMeta[nextType].defaultUnit
                                )

                                form.setFieldValue('match_target', '')
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>

                              <SelectContent alignItemWithTrigger={false}>
                                {goalTypes.map((item) => (
                                  <SelectItem
                                    key={item.value}
                                    value={item.value}
                                  >
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        )}
                      </form.Field>

                      {/* Target */}
                      <form.Field
                        name="target"
                        validators={{
                          onChange: ({ value }) => {
                            const target = Number(value)

                            if (!Number.isFinite(target)) {
                              return 'Enter a valid target.'
                            }

                            if (target <= 0) {
                              return 'Target must be greater than 0.'
                            }

                            return undefined
                          },
                        }}
                      >
                        {(field) => (
                          <Field
                            data-invalid={
                              field.state.meta.isTouched &&
                              !field.state.meta.isValid
                            }
                          >
                            <FieldLabel htmlFor={field.name}>Target</FieldLabel>

                            <InputGroup>
                              <InputGroupInput
                                id={field.name}
                                name={field.name}
                                type="number"
                                min={1}
                                step={1}
                                value={field.state.value}
                                placeholder="100"
                                disabled={isPending}
                                aria-invalid={
                                  field.state.meta.isTouched &&
                                  !field.state.meta.isValid
                                }
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                  field.handleChange(Number(event.target.value))
                                }
                              />

                              <form.Subscribe
                                selector={(state) => state.values.unit}
                              >
                                {(unit) => (
                                  <InputGroupText className="mr-2">
                                    {unit || 'units'}
                                  </InputGroupText>
                                )}
                              </form.Subscribe>
                            </InputGroup>

                            {field.state.meta.isTouched &&
                              !field.state.meta.isValid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                          </Field>
                        )}
                      </form.Field>
                    </FieldSet>

                    {/* Unit */}
                    <form.Field
                      name="unit"
                      validators={{
                        onChange: ({ value }) => {
                          if (!value.trim()) {
                            return 'Unit is required.'
                          }

                          if (value.trim().length > 30) {
                            return 'Unit must be less than 30 characters.'
                          }

                          return undefined
                        },
                      }}
                    >
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid
                          }
                        >
                          <FieldLabel htmlFor={field.name}>Unit</FieldLabel>

                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            placeholder="events"
                            disabled={isPending}
                            aria-invalid={
                              field.state.meta.isTouched &&
                              !field.state.meta.isValid
                            }
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                          />

                          <FieldDescription>
                            Used when displaying progress toward the target.
                          </FieldDescription>

                          {field.state.meta.isTouched &&
                            !field.state.meta.isValid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                        </Field>
                      )}
                    </form.Field>

                    {/* Match Target */}
                    <form.Subscribe selector={(state) => state.values.type}>
                      {(type) => {
                        const meta = goalTypeMeta[type]

                        return (
                          <form.Field
                            name="match_target"
                            validators={{
                              onChange: ({ value }) => {
                                if (!value.trim()) {
                                  return `${meta.matchLabel} is required.`
                                }

                                return undefined
                              },
                            }}
                          >
                            {(field) => (
                              <Field
                                data-invalid={
                                  field.state.meta.isTouched &&
                                  !field.state.meta.isValid
                                }
                              >
                                <FieldLabel htmlFor={field.name}>
                                  {meta.matchLabel}
                                </FieldLabel>

                                <Input
                                  id={field.name}
                                  name={field.name}
                                  value={field.state.value}
                                  placeholder={meta.matchPlaceholder}
                                  disabled={isPending}
                                  aria-invalid={
                                    field.state.meta.isTouched &&
                                    !field.state.meta.isValid
                                  }
                                  onBlur={field.handleBlur}
                                  onChange={(event) =>
                                    field.handleChange(event.target.value)
                                  }
                                />

                                <FieldDescription>
                                  {meta.matchDescription}
                                </FieldDescription>

                                {field.state.meta.isTouched &&
                                  !field.state.meta.isValid && (
                                    <FieldError
                                      errors={field.state.meta.errors}
                                    />
                                  )}
                              </Field>
                            )}
                          </form.Field>
                        )
                      }}
                    </form.Subscribe>

                    {/* Match Path */}
                    <form.Field
                      name="match_path"
                      validators={{
                        onChange: ({ value }) => {
                          if (!value?.trim()) {
                            return undefined
                          }

                          if (!value.trim().startsWith('/')) {
                            return 'Path must start with /.'
                          }

                          return undefined
                        },
                      }}
                    >
                      {(field) => (
                        <Field
                          data-invalid={
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid
                          }
                        >
                          <FieldLabel htmlFor={field.name}>
                            Match Path
                            <span className="text-muted-foreground ml-1 font-normal">
                              Optional
                            </span>
                          </FieldLabel>

                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value ?? ''}
                            placeholder="/signup"
                            disabled={isPending}
                            aria-invalid={
                              field.state.meta.isTouched &&
                              !field.state.meta.isValid
                            }
                            onBlur={field.handleBlur}
                            onChange={(event) =>
                              field.handleChange(event.target.value)
                            }
                          />

                          <FieldDescription>
                            Restrict this goal to a specific page path.
                          </FieldDescription>

                          {field.state.meta.isTouched &&
                            !field.state.meta.isValid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                        </Field>
                      )}
                    </form.Field>

                    {/* Deadline */}
                    <form.Field name="deadline">
                      {(field) => {
                        const selectedDate = field.state.value
                          ? new Date(`${field.state.value}T00:00:00`)
                          : undefined

                        return (
                          <Field>
                            <FieldLabel>
                              Deadline
                              <span className="text-muted-foreground ml-1 font-normal">
                                Optional
                              </span>
                            </FieldLabel>

                            <Popover>
                              <PopoverTrigger
                                render={
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={isPending}
                                    className="w-full justify-start text-left font-normal"
                                  />
                                }
                              >
                                <CalendarIcon className="text-muted-foreground size-4" />

                                {selectedDate ? (
                                  format(selectedDate, 'dd MMM yyyy')
                                ) : (
                                  <span className="text-muted-foreground">
                                    Select deadline
                                  </span>
                                )}
                              </PopoverTrigger>

                              <PopoverContent
                                className="w-auto p-0"
                                align="start"
                              >
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={(date) => {
                                    if (!date) {
                                      field.handleChange('')
                                      return
                                    }

                                    const year = date.getFullYear()
                                    const month = String(
                                      date.getMonth() + 1
                                    ).padStart(2, '0')
                                    const day = String(date.getDate()).padStart(
                                      2,
                                      '0'
                                    )

                                    field.handleChange(
                                      `${year}-${month}-${day}`
                                    )
                                  }}
                                  disabled={(date) => {
                                    const today = new Date()
                                    today.setHours(0, 0, 0, 0)

                                    return date < today
                                  }}
                                  captionLayout="dropdown"
                                />
                              </PopoverContent>
                            </Popover>

                            <FieldDescription>
                              Set an optional deadline for reaching this goal.
                            </FieldDescription>
                          </Field>
                        )
                      }}
                    </form.Field>
                  </FieldSet>
                </FieldGroup>
              </form>

              <DialogFooter className="py-2">
                <DialogClose
                  render={<Button variant="outline" disabled={isPending} />}
                >
                  Cancel
                </DialogClose>

                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit]) => (
                    <Button
                      type="submit"
                      form="create-goal-form"
                      disabled={!canSubmit || isPending}
                    >
                      <LoadingSwap isLoading={isPending}>
                        Create Goal
                      </LoadingSwap>
                    </Button>
                  )}
                </form.Subscribe>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Goals */}
        {goalsLoading ? (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(3)].map((_, index) => (
              <GoalCardSkeleton key={index} />
            ))}
          </div>
        ) : !goals?.length ? (
          <div>
            <p className="text-muted-foreground mt-20 text-center">
              No goals found.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                item={goal}
                workspaceId={workspaceId}
                projectId={projectId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const GoalCardSkeleton = () => {
  return (
    <Card className="bg-card/30 rounded-none border-2 border-dashed p-2">
      <CardHeader className="gap-1 p-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>

          <Skeleton className="size-8" />
        </div>

        <Skeleton className="h-3 w-32" />
      </CardHeader>

      <CardContent className="mt-5 space-y-4 p-0">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-7 w-28" />
          </div>

          <Skeleton className="h-4 w-8" />
        </div>

        <Skeleton className="h-2 w-full rounded-full" />

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/40 space-y-2 p-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          <div className="bg-muted/40 space-y-2 p-2">
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      </CardContent>
    </Card>
  )
}

const GoalCard = ({
  item,
  workspaceId,
  projectId,
}: {
  item: Goal
  workspaceId: string
  projectId: string
}) => {
  const navigate = useNavigate()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { mutate: updateGoal, isPending: isUpdating } = useUpdateGoal()
  const { mutate: deleteGoal, isPending: isDeleting } = useDeleteGoal()

  const progress =
    item.target > 0 ? Math.min((item.current / item.target) * 100, 100) : 0

  const statusStyles: Record<Goal['status'], string> = {
    Achieved: 'bg-emerald-500/10 text-emerald-600',
    'On Track': 'bg-blue-500/10 text-blue-600',
    'At Risk': 'bg-destructive/10 text-destructive',
  }

  const editForm = useForm({
    defaultValues: {
      name: item.name,
      type: item.type.toLowerCase() as GoalType,
      target: item.target,
      unit: item.unit,
      match_target: item.matchTarget ?? '',
      match_path: item.matchPath ?? '',
      deadline: item.deadline?.slice(0, 10) ?? '',
    },

    onSubmit: async ({ value }) => {
      updateGoal(
        {
          id: item.id,
          payload: {
            workspace_id: workspaceId,
            project_id: projectId,
            name: value.name.trim(),
            type: value.type,
            target: Number(value.target),
            unit: value.unit.trim(),
            match_target: value.match_target.trim(),
            match_path: value.match_path?.trim() || null,
            deadline: value.deadline || null,
          },
        },
        {
          onSuccess: () => {
            setEditOpen(false)
          },
        }
      )
    },
  })

  const handleDelete = () => {
    deleteGoal(
      {
        id: item.id,
        workspace_id: workspaceId,
        project_id: projectId,
      },
      {
        onSuccess: () => {
          setDeleteOpen(false)
        },
      }
    )
  }

  return (
    <>
      <Card
        onClick={() => {
          navigate({
            to: '/app/$workspaceId/$projectId/goals/$goalId',
            params: {
              goalId: item.id,
            },
          })
        }}
        className="bg-card/30 hover:bg-muted/50 cursor-pointer rounded-none border-2 border-dashed p-2 duration-200"
      >
        <CardHeader className="gap-1 p-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <CardTitle className="truncate">{item.name}</CardTitle>

              <Badge variant="secondary">{item.type}</Badge>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(event) => {
                      event.stopPropagation()
                    }}
                  />
                }
              >
                <EllipsisIcon />
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                onClick={(event) => {
                  event.stopPropagation()
                }}
              >
                <DropdownMenuItem
                  onClick={() => {
                    editForm.reset({
                      name: item.name,
                      type: item.type.toLowerCase() as GoalType,
                      target: item.target,
                      unit: item.unit,
                      match_target: item.matchTarget ?? '',
                      match_path: item.matchPath ?? '',
                      deadline: item.deadline?.slice(0, 10) ?? '',
                    })

                    setEditOpen(true)
                  }}
                >
                  Edit
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setDeleteOpen(true)
                  }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CardDescription className="text-xs">
            Created {formatDate(item.createdAt)}
          </CardDescription>
        </CardHeader>

        <CardContent className="mt-5 space-y-4 p-0">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-muted-foreground text-xs">Progress</p>

              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-semibold">{item.current}</span>

                <span className="text-muted-foreground text-sm">
                  / {item.target} {item.unit}
                </span>
              </div>
            </div>

            <p className="text-sm font-medium">{progress.toFixed(0)}%</p>
          </div>

          <Progress value={progress} />

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/40 p-2">
              <p className="text-muted-foreground text-[11px]">Status</p>

              <Badge
                variant="secondary"
                className={`mt-1 border-0 ${statusStyles[item.status]}`}
              >
                {item.status}
              </Badge>
            </div>

            <div className="bg-muted/40 p-2">
              <p className="text-muted-foreground text-[11px]">Trend</p>

              <p className="mt-1 text-sm font-medium">{item.trendValue}</p>
            </div>
          </div>

          <div className="text-muted-foreground flex items-center justify-between border-t pt-3 text-xs">
            <p>
              {item.deadline
                ? `Deadline ${formatDate(item.deadline)}`
                : 'No deadline'}
            </p>

            <p>{item.matchTarget}</p>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!isUpdating) {
            setEditOpen(open)
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>

            <DialogDescription>
              Update this goal configuration.
            </DialogDescription>
          </DialogHeader>

          <form
            id={`edit-goal-${item.id}`}
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()

              void editForm.handleSubmit()
            }}
          >
            <FieldGroup>
              <FieldSet>
                <editForm.Field name="name">
                  {(field) => (
                    <Field>
                      <FieldLabel>Name</FieldLabel>

                      <Input
                        value={field.state.value}
                        disabled={isUpdating}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                    </Field>
                  )}
                </editForm.Field>

                <FieldSet className="grid grid-cols-2 gap-4">
                  <editForm.Field name="type">
                    {(field) => (
                      <Field>
                        <FieldLabel>Type</FieldLabel>

                        <Select
                          value={field.state.value}
                          disabled={isUpdating}
                          items={goalTypes}
                          onValueChange={(value) => {
                            if (!value) return

                            const nextType = value as GoalType

                            field.handleChange(nextType)

                            editForm.setFieldValue(
                              'unit',
                              goalTypeMeta[nextType].defaultUnit
                            )
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent alignItemWithTrigger={false}>
                            {goalTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                    )}
                  </editForm.Field>

                  <editForm.Field name="target">
                    {(field) => (
                      <Field>
                        <FieldLabel>Target</FieldLabel>

                        <InputGroup>
                          <InputGroupInput
                            type="number"
                            min={1}
                            value={field.state.value}
                            disabled={isUpdating}
                            onChange={(event) =>
                              field.handleChange(Number(event.target.value))
                            }
                          />

                          <editForm.Subscribe
                            selector={(state) => state.values.unit}
                          >
                            {(unit) => (
                              <InputGroupText className="mr-2">
                                {unit || 'units'}
                              </InputGroupText>
                            )}
                          </editForm.Subscribe>
                        </InputGroup>
                      </Field>
                    )}
                  </editForm.Field>
                </FieldSet>

                <editForm.Field name="unit">
                  {(field) => (
                    <Field>
                      <FieldLabel>Unit</FieldLabel>

                      <Input
                        value={field.state.value}
                        disabled={isUpdating}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                    </Field>
                  )}
                </editForm.Field>

                <editForm.Subscribe selector={(state) => state.values.type}>
                  {(type) => {
                    const meta = goalTypeMeta[type]

                    return (
                      <editForm.Field name="match_target">
                        {(field) => (
                          <Field>
                            <FieldLabel>{meta.matchLabel}</FieldLabel>

                            <Input
                              value={field.state.value}
                              placeholder={meta.matchPlaceholder}
                              disabled={isUpdating}
                              onChange={(event) =>
                                field.handleChange(event.target.value)
                              }
                            />

                            <FieldDescription>
                              {meta.matchDescription}
                            </FieldDescription>
                          </Field>
                        )}
                      </editForm.Field>
                    )
                  }}
                </editForm.Subscribe>

                <editForm.Field name="match_path">
                  {(field) => (
                    <Field>
                      <FieldLabel>
                        Match Path
                        <span className="text-muted-foreground ml-1 font-normal">
                          Optional
                        </span>
                      </FieldLabel>

                      <Input
                        value={field.state.value ?? ''}
                        placeholder="/signup"
                        disabled={isUpdating}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                      />
                    </Field>
                  )}
                </editForm.Field>

                <editForm.Field name="deadline">
                  {(field) => {
                    const selectedDate = field.state.value
                      ? new Date(`${field.state.value}T00:00:00`)
                      : undefined

                    return (
                      <Field>
                        <FieldLabel>
                          Deadline
                          <span className="text-muted-foreground ml-1 font-normal">
                            Optional
                          </span>
                        </FieldLabel>

                        <Popover>
                          <PopoverTrigger
                            render={
                              <Button
                                type="button"
                                variant="outline"
                                disabled={isUpdating}
                                className="w-full justify-start text-left font-normal"
                              />
                            }
                          >
                            {selectedDate
                              ? format(selectedDate, 'dd MMM yyyy')
                              : 'Select deadline'}
                          </PopoverTrigger>

                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={selectedDate}
                              onSelect={(date) => {
                                if (!date) {
                                  field.handleChange('')
                                  return
                                }

                                const year = date.getFullYear()

                                const month = String(
                                  date.getMonth() + 1
                                ).padStart(2, '0')

                                const day = String(date.getDate()).padStart(
                                  2,
                                  '0'
                                )

                                field.handleChange(`${year}-${month}-${day}`)
                              }}
                              captionLayout="dropdown"
                            />
                          </PopoverContent>
                        </Popover>
                      </Field>
                    )
                  }}
                </editForm.Field>
              </FieldSet>
            </FieldGroup>
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isUpdating}
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form={`edit-goal-${item.id}`}
              disabled={isUpdating}
            >
              <LoadingSwap isLoading={isUpdating}>Save Changes</LoadingSwap>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!isDeleting) {
            setDeleteOpen(open)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Goal</DialogTitle>

            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="text-foreground font-medium">{item.name}</span>?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              <LoadingSwap isLoading={isDeleting}>Delete Goal</LoadingSwap>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
