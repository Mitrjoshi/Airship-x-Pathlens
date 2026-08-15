import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  ProjectPanel,
  PageToolbar,
} from '@/components/common/project-page'
import { PlanLimitNotice } from '@/components/common/plan-gate'
import { useCreateGoal, useDeleteGoal, useUpdateGoal } from '@/mutations/goals'
import {
  getGoalsOptions,
  type Goal,
  type GoalRange,
  type GoalType,
} from '@/queries/goals'
import { getWorkspacesOptions } from '@/queries/workspace'
import { getPlanDefinition, useWorkspacePlan } from '@/lib/billing'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@workspace/ui/components/alert-dialog'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
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
import { Progress } from '@workspace/ui/components/progress'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Calendar } from '@workspace/ui/components/calendar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  ArrowRight,
  CalendarIcon,
  CheckCircle2,
  DollarSign,
  MoreHorizontal,
  MousePointerClick,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
  UserPlus,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@workspace/ui/lib/utils'
import { formatDate, formatNumber } from '@/utils/utils'
import { format, parseISO } from 'date-fns'

export const Route = createFileRoute('/app/$workspace/projects/$project/goals')(
  {
    component: RouteComponent,
    staticData: {
      breadcrumb: 'Goals',
    },
  }
)

type GoalFilter = 'all' | Goal['status']

const rangeOptions: { label: string; value: GoalRange }[] = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

function renderGoalIcon(type: Goal['type']) {
  if (type === 'Revenue')
    return <DollarSign className="text-muted-foreground h-4 w-4" />
  if (type === 'Button') {
    return <MousePointerClick className="text-muted-foreground h-4 w-4" />
  }
  if (type === 'Form submit') {
    return <CheckCircle2 className="text-muted-foreground h-4 w-4" />
  }
  if (type === 'Pageview') {
    return <MousePointerClick className="text-muted-foreground h-4 w-4" />
  }

  return <UserPlus className="text-muted-foreground h-4 w-4" />
}

function renderGoalTargetLabel(type: GoalType) {
  if (type === 'pageview') return 'Page path'
  if (type === 'revenue') return 'Revenue event type'
  if (type === 'button') return 'Button text'
  if (type === 'form_submit') return 'Form ID'

  return 'Event type or page path'
}

function getGoalType(type: Goal['type']): GoalType {
  if (type === 'Pageview') return 'pageview'
  if (type === 'Revenue') return 'revenue'
  if (type === 'Button') return 'button'
  if (type === 'Form submit') return 'form_submit'

  return 'event'
}

function statusBadgeClass(status: Goal['status']) {
  if (status === 'Achieved') {
    return 'bg-green-500/15 text-green-600 hover:bg-green-500/15'
  }
  if (status === 'At Risk') {
    return 'bg-red-500/15 text-red-600 hover:bg-red-500/15'
  }

  return 'bg-blue-500/15 text-blue-600 hover:bg-blue-500/15'
}

function formatValue(value: number, unit: string) {
  if (unit === '$') return `$${formatNumber(value)}`

  return `${formatNumber(value)} ${unit}`.trim()
}

function RouteComponent() {
  return <PageContent />
}

function PageContent() {
  const { workspace, project } = Route.useParams()
  const [range, setRange] = useState<GoalRange>('30d')
  const [filter, setFilter] = useState<GoalFilter>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<GoalType>('event')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('events')
  const [matchTarget, setMatchTarget] = useState('')
  const [matchPath, setMatchPath] = useState('')
  const [deadline, setDeadline] = useState<Date | undefined>(undefined)
  const [deadlinePickerOpen, setDeadlinePickerOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null)
  const [deleteGoalName, setDeleteGoalName] = useState('')

  const { data, isError, isPending } = useQuery(
    getGoalsOptions({
      workspace_id: workspace,
      project_id: project,
      range,
    })
  )
  const { data: workspaceData } = useQuery(getWorkspacesOptions())
  const createGoal = useCreateGoal()
  const updateGoal = useUpdateGoal()
  const deleteGoal = useDeleteGoal()
  const currentWorkspace = workspaceData?.data.find(
    (item) => item.id === workspace
  )
  const canManageGoals =
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes('analytics.goals.manage')

  const goals = data?.data ?? []
  const currentPlanId = useWorkspacePlan(workspace)
  const currentPlan = getPlanDefinition(currentPlanId)
  const goalLimit = currentPlan.limits.goals
  const goalLimitReached = goalLimit !== null && goals.length >= goalLimit
  const filteredGoals =
    filter === 'all' ? goals : goals.filter((goal) => goal.status === filter)
  const achievedCount = goals.filter(
    (goal) => goal.status === 'Achieved'
  ).length
  const atRiskCount = goals.filter((goal) => goal.status === 'At Risk').length
  const onTrackCount = goals.filter((goal) => goal.status === 'On Track').length
  const isSubmitting = createGoal.isPending || updateGoal.isPending

  const openCreateDialog = () => {
    setEditingGoalId(null)
    setName('')
    setType('event')
    setTarget('')
    setUnit('events')
    setMatchTarget('')
    setMatchPath('')
    setDeadline(undefined)
    setFormError('')
    setDialogOpen(true)
  }

  const openEditDialog = (goal: Goal) => {
    const goalType = getGoalType(goal.type)

    setEditingGoalId(goal.id)
    setName(goal.name)
    setType(goalType)
    setTarget(String(goal.target))
    setUnit(goal.unit)
    setMatchTarget(goal.matchTarget)
    setMatchPath(goal.matchPath ?? '')
    setDeadline(goal.deadline ? parseISO(goal.deadline) : undefined)
    setFormError('')
    setDialogOpen(true)
  }

  const handleTypeChange = (value: GoalType) => {
    setType(value)
    if (value === 'revenue') setUnit('$')
    if (value === 'pageview') setUnit('views')
    if (value === 'event') setUnit('events')
    if (value === 'button') setUnit('clicks')
    if (value === 'form_submit') setUnit('submissions')
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!editingGoalId && goalLimitReached && goalLimit !== null) {
      setFormError(
        `Your ${currentPlan.name} plan allows ${goalLimit} goal. Upgrade to create more.`
      )
      return
    }

    const numericTarget = Number(target)

    if (!name.trim()) {
      setFormError('Enter a goal name.')
      return
    }
    if (!Number.isFinite(numericTarget) || numericTarget <= 0) {
      setFormError('Enter a target greater than zero.')
      return
    }
    if (!matchTarget.trim()) {
      setFormError(`Enter a ${renderGoalTargetLabel(type).toLowerCase()}.`)
      return
    }
    if (type === 'button' && !matchPath.trim()) {
      setFormError('Enter the page path for this button goal.')
      return
    }
    if (!unit.trim()) {
      setFormError('Enter a unit for this goal.')
      return
    }

    const payload = {
      workspace_id: workspace,
      project_id: project,
      name: name.trim(),
      type,
      target: numericTarget,
      unit: unit.trim(),
      match_target: matchTarget.trim(),
      match_path: type === 'button' ? matchPath.trim() : null,
      deadline: deadline ? format(deadline, 'yyyy-MM-dd') : null,
    }

    if (editingGoalId) {
      updateGoal.mutate(
        { id: editingGoalId, payload },
        { onSuccess: () => setDialogOpen(false) }
      )
    } else {
      createGoal.mutate(payload, {
        onSuccess: (result) => {
          setDialogOpen(false)
          if (result.data?.id) setFilter('all')
        },
      })
    }
  }

  const handleDelete = (goal: Goal) => {
    setDeleteGoalId(goal.id)
    setDeleteGoalName(goal.name)
  }

  const confirmDelete = () => {
    if (!deleteGoalId) return

    deleteGoal.mutate(
      {
        id: deleteGoalId,
        workspace_id: workspace,
        project_id: project,
      },
      {
        onSuccess: () => {
          setDeleteGoalId(null)
          setDeleteGoalName('')
        },
      }
    )
  }

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Targets"
          title="Goals"
          description="Set and track targets against real events collected by your project."
          actions={
            <Button
              onClick={openCreateDialog}
              disabled={!canManageGoals || goalLimitReached}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Goal
            </Button>
          }
        />

        {goalLimitReached && goalLimit !== null && (
          <PlanLimitNotice
            workspaceId={workspace}
            resource="goal"
            limit={goalLimit}
          />
        )}

        <PageToolbar className="justify-end">
          <Select
            value={range}
            onValueChange={(value) => setRange(value as GoalRange)}
          >
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              {rangeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as GoalFilter)}
          >
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Goals</SelectItem>
              <SelectItem value="On Track">On Track</SelectItem>
              <SelectItem value="At Risk">At Risk</SelectItem>
              <SelectItem value="Achieved">Achieved</SelectItem>
            </SelectContent>
          </Select>
        </PageToolbar>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="w-full max-w-lg!">
            <DialogHeader>
              <DialogTitle>
                {editingGoalId ? 'Edit goal' : 'Create a goal'}
              </DialogTitle>
              <DialogDescription>
                Goal progress is calculated from events in the selected project.
              </DialogDescription>
            </DialogHeader>

            <form id="goal-form" className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="goal-name">Goal name</Label>
                <Input
                  id="goal-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Monthly signups"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={type}
                    onValueChange={(value) =>
                      handleTypeChange(value as GoalType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="revenue">Revenue</SelectItem>
                      <SelectItem value="pageview">Pageview</SelectItem>
                      <SelectItem value="button">Button click</SelectItem>
                      <SelectItem value="form_submit">Form submit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="goal-target">Target</Label>
                  <Input
                    id="goal-target"
                    type="number"
                    min="0"
                    step={type === 'revenue' ? '0.01' : '1'}
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    placeholder={type === 'revenue' ? '5000' : '5000'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-unit">Unit</Label>
                  <Input
                    id="goal-unit"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                    placeholder={type === 'revenue' ? '$' : 'events'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Deadline</Label>
                  <Popover
                    open={deadlinePickerOpen}
                    onOpenChange={setDeadlinePickerOpen}
                  >
                    <PopoverTrigger
                      render={
                        <Button
                          variant="outline"
                          data-empty={!deadline}
                          className="data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal"
                        />
                      }
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {deadline ? format(deadline, 'PPP') : 'No deadline'}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={deadline}
                        onSelect={(date) => {
                          setDeadline(date)
                          setDeadlinePickerOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {type === 'button' && (
                <div className="space-y-2">
                  <Label htmlFor="goal-match-path">Page path</Label>
                  <Input
                    id="goal-match-path"
                    value={matchPath}
                    onChange={(event) => setMatchPath(event.target.value)}
                    placeholder="/pricing"
                  />
                  <p className="text-muted-foreground text-xs">
                    Use the exact pathname where the button appears.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="goal-match-target">
                  {renderGoalTargetLabel(type)}
                </Label>
                <Input
                  id="goal-match-target"
                  value={matchTarget}
                  onChange={(event) => setMatchTarget(event.target.value)}
                  placeholder={
                    type === 'pageview'
                      ? '/pricing'
                      : type === 'button'
                        ? 'Start free trial'
                        : type === 'form_submit'
                          ? 'signup-form'
                          : 'signup'
                  }
                />
                <p className="text-muted-foreground text-xs">
                  {type === 'revenue'
                    ? 'The matching event payload should include revenue, value, or amount.'
                    : type === 'button'
                      ? 'Button text is matched exactly after whitespace normalization.'
                      : type === 'form_submit'
                        ? 'Use the exact id of the submitted form.'
                        : 'Use the exact tracked path or event type.'}
                </p>
              </div>

              {formError && (
                <p className="text-destructive text-sm">{formError}</p>
              )}
            </form>

            <DialogFooter>
              <Button
                type="submit"
                form="goal-form"
                disabled={isSubmitting || !canManageGoals}
              >
                {isSubmitting
                  ? 'Saving...'
                  : editingGoalId
                    ? 'Save Goal'
                    : 'Create Goal'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={deleteGoalId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteGoalId(null)
              setDeleteGoalName('')
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the goal "{deleteGoalName}" and all
                its tracked data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmDelete}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {isError && (
          <p className="text-destructive text-sm">
            Unable to load goals for this project.
          </p>
        )}

        <ProjectMetricStrip className="lg:grid-cols-4">
          <ProjectMetric
            label="Total goals"
            value={formatNumber(goals.length)}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Achieved"
            value={formatNumber(achievedCount)}
            icon={CheckCircle2}
            isLoading={isPending}
          />
          <ProjectMetric
            label="At risk"
            value={formatNumber(atRiskCount)}
            icon={TrendingDown}
            isLoading={isPending}
          />
          <ProjectMetric
            label="On track"
            value={formatNumber(onTrackCount)}
            icon={TrendingUp}
            isLoading={isPending}
          />
        </ProjectMetricStrip>

        {isPending ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : filteredGoals.length === 0 ? (
          <ProjectPanel>
            <CardContent className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <Target className="text-muted-foreground mb-4 size-8" />
              <p className="font-medium">
                {goals.length === 0
                  ? 'No goals yet'
                  : 'No goals match this filter'}
              </p>
              <p className="text-muted-foreground mt-2 max-w-md text-sm">
                {goals.length === 0
                  ? 'Create a target and connect it to a tracked event or page path.'
                  : 'Choose another status filter to view your goals.'}
              </p>
              {goals.length === 0 && (
                <Button
                  className="mt-5"
                  onClick={openCreateDialog}
                  disabled={!canManageGoals}
                >
                  <Plus className="mr-2 size-4" />
                  Create your first goal
                </Button>
              )}
            </CardContent>
          </ProjectPanel>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {filteredGoals.map((goal) => {
                const percent = Math.min(
                  Math.round((goal.current / goal.target) * 100),
                  100
                )

                return (
                  <ProjectPanel key={goal.id}>
                    <CardHeader className="flex flex-row items-start justify-between px-5 py-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="bg-muted shrink-0 rounded-md p-2">
                          {renderGoalIcon(goal.type)}
                        </div>
                        <div className="min-w-0">
                          <CardTitle className="truncate text-base">
                            {goal.name}
                          </CardTitle>
                          <CardDescription className="truncate">
                            {goal.type} · {goal.matchTarget}
                            {goal.type === 'Button' && goal.matchPath
                              ? ` · ${goal.matchPath}`
                              : ''}
                            {goal.deadline
                              ? ` · Due ${formatDate(goal.deadline)}`
                              : ''}
                          </CardDescription>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              disabled={!canManageGoals}
                            />
                          }
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(goal)}
                          >
                            Edit Goal
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(goal)}
                          >
                            Delete Goal
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>

                    <CardContent className="space-y-4 p-5 pt-0">
                      <div className="flex items-end justify-between gap-4">
                        <div>
                          <span className="text-2xl font-bold">
                            {formatValue(goal.current, goal.unit)}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {' '}
                            / {formatValue(goal.target, goal.unit)}
                          </span>
                        </div>

                        <div
                          className={cn(
                            'flex items-center gap-1 text-sm',
                            goal.trend === 'up'
                              ? 'text-green-500'
                              : goal.trend === 'down'
                                ? 'text-red-500'
                                : 'text-muted-foreground'
                          )}
                        >
                          {goal.trend === 'up' ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : goal.trend === 'down' ? (
                            <TrendingDown className="h-4 w-4" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                          {goal.trendValue}
                        </div>
                      </div>

                      <Progress
                        value={percent}
                        className={cn(
                          goal.status === 'Achieved' && '[&>div]:bg-green-500',
                          goal.status === 'At Risk' && '[&>div]:bg-destructive'
                        )}
                      />

                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                          {percent}% complete
                        </span>
                        <Badge className={statusBadgeClass(goal.status)}>
                          {goal.status}
                        </Badge>
                      </div>
                    </CardContent>
                  </ProjectPanel>
                )
              })}
            </div>

            <ProjectPanel>
              <CardHeader className="border-b px-5 py-5">
                <CardTitle>All Goals</CardTitle>
                <CardDescription>
                  Progress calculated from the selected range
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-[720px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-5">Goal</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGoals.map((goal) => {
                        const percent = Math.min(
                          Math.round((goal.current / goal.target) * 100),
                          100
                        )

                        return (
                          <TableRow key={goal.id}>
                            <TableCell className="px-5 font-medium">
                              {goal.name}
                            </TableCell>
                            <TableCell>{goal.type}</TableCell>
                            <TableCell>
                              {formatValue(goal.current, goal.unit)} /{' '}
                              {formatValue(goal.target, goal.unit)} ({percent}%)
                            </TableCell>
                            <TableCell>
                              {goal.deadline
                                ? formatDate(goal.deadline)
                                : 'No deadline'}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusBadgeClass(goal.status)}>
                                {goal.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </ProjectPanel>
          </>
        )}
      </div>
    </ProjectPageLayout>
  )
}
