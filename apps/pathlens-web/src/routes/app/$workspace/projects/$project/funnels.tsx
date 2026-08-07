import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
} from '@/components/common/project-page'
import {
  useCreateFunnel,
  useDeleteFunnel,
  useUpdateFunnel,
} from '@/mutations/funnels'
import {
  getFunnelsOptions,
  type Funnel,
  type FunnelRange,
} from '@/queries/funnels'
import { getWorkspacesOptions } from '@/queries/workspace'
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
  Card,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  ArrowRight,
  Filter,
  MoreHorizontal,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@workspace/ui/lib/utils'
import { formatNumber } from '@/utils/utils'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/funnels'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Funnels',
  },
})

interface DraftStep {
  name: string
  target: string
}

const rangeOptions: { label: string; value: FunnelRange }[] = [
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

function FunnelStepBar({
  step,
  index,
  maxVisitors,
  previousVisitors,
}: {
  step: Funnel['steps'][number]
  index: number
  maxVisitors: number
  previousVisitors?: number
}) {
  const widthPercent = Math.max((step.visitors / maxVisitors) * 100, 4)
  const dropOffPercent = previousVisitors
    ? Math.round(((previousVisitors - step.visitors) / previousVisitors) * 100)
    : null

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <Badge
            variant="outline"
            className="h-5 w-5 shrink-0 justify-center p-0"
          >
            {index + 1}
          </Badge>
          <div className="min-w-0">
            <span className="block truncate font-medium">{step.name}</span>
            <span className="text-muted-foreground block truncate text-xs">
              {step.target}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {dropOffPercent !== null && dropOffPercent > 0 && (
            <span className="text-destructive hidden text-xs sm:inline">
              -{dropOffPercent}% drop-off
            </span>
          )}
          <span className="text-muted-foreground font-mono text-xs">
            {formatNumber(step.visitors)}
          </span>
        </div>
      </div>

      <div className="bg-muted h-8 w-full overflow-hidden rounded-md">
        <div
          className="bg-primary flex h-full items-center rounded-md transition-all"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  )
}

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const [range, setRange] = useState<FunnelRange>('7d')
  const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingFunnelId, setEditingFunnelId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [draftSteps, setDraftSteps] = useState<DraftStep[]>([
    { name: '', target: '' },
    { name: '', target: '' },
  ])
  const [formError, setFormError] = useState('')
  const [deleteFunnelId, setDeleteFunnelId] = useState<string | null>(null)
  const [deleteFunnelName, setDeleteFunnelName] = useState('')

  const { data, isError, isPending } = useQuery(
    getFunnelsOptions({
      workspace_id: workspace,
      project_id: project,
      range,
    })
  )
  const { data: workspaceData } = useQuery(getWorkspacesOptions())
  const createFunnel = useCreateFunnel()
  const updateFunnel = useUpdateFunnel()
  const deleteFunnel = useDeleteFunnel()
  const currentWorkspace = workspaceData?.data.find(
    (item) => item.id === workspace
  )
  const canManageFunnels =
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes('analytics.funnels.manage')

  const funnels = data?.data ?? []
  const selectedFunnel =
    funnels.find((funnel) => funnel.id === selectedFunnelId) ?? funnels[0]
  const enteredVisitors = selectedFunnel?.steps[0]?.visitors ?? 0
  const completedVisitors =
    selectedFunnel?.steps[selectedFunnel.steps.length - 1]?.visitors ?? 0
  const maxVisitors = selectedFunnel?.steps[0]?.visitors || 1

  const openCreateDialog = () => {
    setEditingFunnelId(null)
    setName('')
    setDescription('')
    setDraftSteps([
      { name: '', target: '' },
      { name: '', target: '' },
    ])
    setFormError('')
    setDialogOpen(true)
  }

  const openEditDialog = (funnel: Funnel) => {
    setEditingFunnelId(funnel.id)
    setName(funnel.name)
    setDescription(funnel.description)
    setDraftSteps(
      funnel.steps.map(({ name: stepName, target }) => ({
        name: stepName,
        target,
      }))
    )
    setFormError('')
    setDialogOpen(true)
  }

  const updateStep = (index: number, field: keyof DraftStep, value: string) => {
    setDraftSteps((steps) =>
      steps.map((step, stepIndex) =>
        stepIndex === index ? { ...step, [field]: value } : step
      )
    )
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const steps = draftSteps.map((step) => ({
      name: step.name.trim(),
      target: step.target.trim(),
    }))

    if (!name.trim()) {
      setFormError('Enter a funnel name.')
      return
    }

    if (steps.length < 2 || steps.some((step) => !step.name || !step.target)) {
      setFormError('Add a name and path or event target for every step.')
      return
    }

    const payload = {
      workspace_id: workspace,
      project_id: project,
      name: name.trim(),
      description: description.trim() || null,
      steps,
    }

    if (editingFunnelId) {
      updateFunnel.mutate(
        { id: editingFunnelId, payload },
        { onSuccess: () => setDialogOpen(false) }
      )
    } else {
      createFunnel.mutate(payload, {
        onSuccess: (result) => {
          setDialogOpen(false)
          if (result.data?.id) setSelectedFunnelId(result.data.id)
        },
      })
    }
  }

  const handleDelete = (funnel: Funnel) => {
    setDeleteFunnelId(funnel.id)
    setDeleteFunnelName(funnel.name)
  }

  const confirmDelete = () => {
    if (!deleteFunnelId) return

    deleteFunnel.mutate(
      {
        id: deleteFunnelId,
        workspace_id: workspace,
        project_id: project,
      },
      {
        onSuccess: () => {
          setDeleteFunnelId(null)
          setDeleteFunnelName('')
        },
      }
    )
  }

  const isSubmitting = createFunnel.isPending || updateFunnel.isPending

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Conversion"
          title="Funnels"
          description="Track conversion through key user journeys using your captured events."
          actions={
            <Button onClick={openCreateDialog} disabled={!canManageFunnels}>
              <Plus className="mr-2 h-4 w-4" />
              New Funnel
            </Button>
          }
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="w-full max-w-xl!">
            <DialogHeader>
              <DialogTitle>
                {editingFunnelId ? 'Edit funnel' : 'Create a funnel'}
              </DialogTitle>
              <DialogDescription>
                Use a page path such as <code>/pricing</code> or an event type
                such as <code>form_submit</code> for each step.
              </DialogDescription>
            </DialogHeader>

            <form
              id="funnel-form"
              className="space-y-5"
              onSubmit={handleSubmit}
            >
              <div className="space-y-2">
                <Label htmlFor="funnel-name">Funnel name</Label>
                <Input
                  id="funnel-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Signup flow"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="funnel-description">Description</Label>
                <Input
                  id="funnel-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Landing page to account created"
                />
              </div>

              <div className="space-y-3">
                <Label>Steps</Label>
                {draftSteps.map((step, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[1fr_1fr_auto] gap-2"
                  >
                    <Input
                      value={step.name}
                      onChange={(event) =>
                        updateStep(index, 'name', event.target.value)
                      }
                      placeholder={`Step ${index + 1} name`}
                    />
                    <Input
                      value={step.target}
                      onChange={(event) =>
                        updateStep(index, 'target', event.target.value)
                      }
                      placeholder="/pricing or click"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove step ${index + 1}`}
                      disabled={draftSteps.length <= 2}
                      onClick={() =>
                        setDraftSteps((steps) =>
                          steps.filter((_, stepIndex) => stepIndex !== index)
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"

                  onClick={() =>
                    setDraftSteps((steps) => [
                      ...steps,
                      { name: '', target: '' },
                    ])
                  }
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Add Step
                </Button>
              </div>

              {formError && (
                <p className="text-destructive text-sm">{formError}</p>
              )}
            </form>

            <DialogFooter>
              <Button
                type="submit"
                form="funnel-form"
                disabled={isSubmitting || !canManageFunnels}
              >
                {isSubmitting
                  ? 'Saving...'
                  : editingFunnelId
                    ? 'Save Funnel'
                    : 'Create Funnel'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={deleteFunnelId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteFunnelId(null)
              setDeleteFunnelName('')
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this funnel?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the funnel "{deleteFunnelName}" and
                all its data. This action cannot be undone.
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
          <p className="text-destructive -mt-4 text-sm">
            Unable to load funnels for this project.
          </p>
        )}

        <ProjectMetricStrip className="lg:grid-cols-4">
          <ProjectMetric
            label="Funnels"
            value={formatNumber(funnels.length)}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Entered"
            value={formatNumber(enteredVisitors)}
            icon={Users}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Completed"
            value={formatNumber(completedVisitors)}
            icon={ArrowRight}
            isLoading={isPending}
          />
          <ProjectMetric
            label="Conversion"
            value={`${selectedFunnel?.conversionRate ?? 0}%`}
            isLoading={isPending}
          />
        </ProjectMetricStrip>

        {isPending ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-44 rounded-xl" />
            ))}
          </div>
        ) : funnels.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center px-5 py-16 text-center">
              <Filter className="text-muted-foreground mb-4 size-8" />
              <p className="font-medium">No funnels yet</p>
              <p className="text-muted-foreground mt-2 max-w-md text-sm">
                Create a funnel with page paths or event types to measure real
                visitor progression.
              </p>
              <Button
                className="mt-5"
                onClick={openCreateDialog}
                disabled={!canManageFunnels}
              >
                <Plus className="mr-2 size-4" />
                Create your first funnel
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {funnels.map((funnel) => (
              <Card
                key={funnel.id}
                role="button"
                tabIndex={0}
                className={cn(
                  'cursor-pointer transition-colors',
                  selectedFunnel?.id === funnel.id && 'border-primary'
                )}
                onClick={() => setSelectedFunnelId(funnel.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setSelectedFunnelId(funnel.id)
                  }
                }}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="bg-muted shrink-0 rounded-md p-1.5">
                      <Filter className="text-muted-foreground h-4 w-4" />
                    </div>
                    <CardTitle className="truncate text-base">
                      {funnel.name}
                    </CardTitle>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          disabled={!canManageFunnels}
                          onClick={(event) => event.stopPropagation()}
                        />
                      }
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation()
                          openEditDialog(funnel)
                        }}
                      >
                        Edit Funnel
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDelete(funnel)
                        }}
                      >
                        Delete Funnel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                <CardContent>
                  <CardDescription className="mb-3 line-clamp-2 min-h-10">
                    {funnel.description || 'No description'}
                  </CardDescription>

                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-2xl font-bold">
                        {funnel.conversionRate}%
                      </div>
                      <div className="text-muted-foreground text-xs">
                        conversion rate
                      </div>
                    </div>

                    <div
                      className={cn(
                        'flex items-center gap-1 text-sm',
                        funnel.trend === 'up'
                          ? 'text-green-500'
                          : funnel.trend === 'down'
                            ? 'text-red-500'
                            : 'text-muted-foreground'
                      )}
                    >
                      {funnel.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : funnel.trend === 'down' ? (
                        <TrendingDown className="h-4 w-4" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                      {funnel.trendValue}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedFunnel && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div className="min-w-0">
                <CardTitle className="truncate">
                  {selectedFunnel.name}
                </CardTitle>
                <CardDescription className="truncate">
                  {selectedFunnel.description || 'Funnel progression'}
                </CardDescription>
              </div>

              <Select
                value={range}
                onValueChange={(value) => setRange(value as FunnelRange)}
              >
                <SelectTrigger
                  className="w-36 shrink-0"
                  aria-label="Funnel date range"
                >
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
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="bg-muted rounded-full p-2">
                    <Users className="text-muted-foreground h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      {formatNumber(enteredVisitors)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Entered funnel
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="bg-muted rounded-full p-2">
                    <ArrowRight className="text-muted-foreground h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      {formatNumber(completedVisitors)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Completed funnel
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg border p-4">
                  <div className="bg-muted rounded-full p-2">
                    {selectedFunnel.trend === 'down' ? (
                      <TrendingDown className="text-muted-foreground h-4 w-4" />
                    ) : (
                      <TrendingUp className="text-muted-foreground h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      {selectedFunnel.conversionRate}%
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Overall conversion
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-5">
                {selectedFunnel.steps.map((step, index) => (
                  <FunnelStepBar
                    key={`${step.name}-${index}`}
                    step={step}
                    index={index}
                    maxVisitors={maxVisitors}
                    previousVisitors={selectedFunnel.steps[index - 1]?.visitors}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ProjectPageLayout>
  )
}
