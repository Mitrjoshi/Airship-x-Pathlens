import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import {
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  EllipsisIcon,
  EyeOffIcon,
  EyeIcon,
  PlusIcon,
} from 'lucide-react'
import type { TrackingScope } from '@workspace/contracts'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import { Calendar } from '@workspace/ui/components/calendar'
import { Checkbox } from '@workspace/ui/components/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Separator } from '@workspace/ui/components/separator'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  getProjectApiKeysOptions,
  type T_ProjectApiKey,
} from '@/queries/api-keys'
import { getWorkspaceByIdOptions } from '@/queries/workspace'

import {
  useCreateProjectApiKey,
  useRevokeProjectApiKey,
} from '@/mutations/api-keys'
import { capitalizeFirstLetter, formatRelativeTime, mask } from '@/utils/utils'
import {
  CodeBlock,
  integrations,
} from '@/routes/(open)/-components/few-lines-of-code'

import { DotSeparator, DotSeparatorItem } from '../../-components/dot-separator'

import { NoPermissionView } from './-components/common/no-permission-view'
import ApiKeyLoading from './-components/common/api-key-loading'

/* -------------------------------------------------------------------------- */
/*                                   Config                                   */
/* -------------------------------------------------------------------------- */

const trackingOptions = [
  {
    name: 'events' as const,
    label: 'Events',
    description: 'Capture page views, clicks, and form submissions.',
    required: true,
  },
  {
    name: 'replay' as const,
    label: 'Session Replay',
    description: 'Reconstruct the path visitors take through your site.',
    required: false,
  },
  {
    name: 'performance' as const,
    label: 'Performance Metrics',
    description: 'Understand how quickly pages load for real visitors.',
    required: false,
  },
  {
    name: 'errors' as const,
    label: 'Error Tracking',
    description: 'Capture uncaught errors and rejected promises.',
    required: false,
  },
] as const

const API_KEY_TABLE_COLUMNS = 9

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type ApiKeyDialogState =
  | {
      type: 'create'
    }
  | {
      type: 'script'
      apiKey: string
    }
  | {
      type: 'deactivate'
      id: string
      name: string
    }
  | null

/* -------------------------------------------------------------------------- */
/*                                    Route                                   */
/* -------------------------------------------------------------------------- */

export const Route = createFileRoute('/app/$workspaceId/$projectId/api-keys')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const [dialog, setDialog] = useState<ApiKeyDialogState>(null)

  const { data: workspace, isLoading: workspaceLoading } = useQuery(
    getWorkspaceByIdOptions(workspaceId)
  )

  const { data: keysData, isLoading: keysLoading } = useQuery(
    getProjectApiKeysOptions(projectId)
  )

  if (workspaceLoading) {
    return <ApiKeyLoading />
  }

  if (!workspace?.data.permissions.includes('project.api_keys.view')) {
    return <NoPermissionView />
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        onCreate={() => {
          setDialog({
            type: 'create',
          })
        }}
      />

      <ApiKeysTable
        data={keysData?.data ?? []}
        isLoading={keysLoading}
        onCreate={() => {
          setDialog({
            type: 'create',
          })
        }}
        onViewScript={(apiKey) => {
          setDialog({
            type: 'script',
            apiKey,
          })
        }}
        onDeactivate={(item) => {
          setDialog({
            type: 'deactivate',
            id: item.id,
            name: item.name,
          })
        }}
      />

      <ApiKeyDialog
        projectId={projectId}
        state={dialog}
        onClose={() => {
          setDialog(null)
        }}
      />
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                 Page Header                                */
/* -------------------------------------------------------------------------- */

function PageHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="space-y-1">
        <h1 className="text-xl font-medium">API Keys</h1>

        <p className="text-muted-foreground text-sm">
          Create and manage API keys used by your project integrations.
        </p>
      </div>

      <Button onClick={onCreate}>
        <PlusIcon />
        New API Key
      </Button>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                                 Keys Table                                 */
/* -------------------------------------------------------------------------- */

type ApiKeysTableProps = {
  data: T_ProjectApiKey[]
  isLoading: boolean
  onCreate: () => void
  onViewScript: (apiKey: string) => void
  onDeactivate: (item: T_ProjectApiKey) => void
}

function ApiKeysTable({
  data,
  isLoading,
  onCreate,
  onViewScript,
  onDeactivate,
}: ApiKeysTableProps) {
  return (
    <div className="overflow-hidden border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Last used</TableHead>
            <TableHead>Expires at</TableHead>
            <TableHead>Created at</TableHead>
            <TableHead className="w-30 text-center">Script</TableHead>
            <TableHead className="w-20 text-center">Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            <ApiKeysTableSkeleton />
          ) : data.length ? (
            data.map((item) => (
              <ApiKeyRow
                key={item.id}
                item={item}
                onViewScript={onViewScript}
                onDeactivate={onDeactivate}
              />
            ))
          ) : (
            <EmptyApiKeys onCreate={onCreate} />
          )}
        </TableBody>
      </Table>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                              Table Skeleton                                */
/* -------------------------------------------------------------------------- */

function ApiKeysTableSkeleton() {
  const widths = [
    'w-36',
    'w-20',
    'w-28',
    'w-40',
    'w-20',
    'w-24',
    'w-24',
    'w-20',
    'w-8',
  ]

  return (
    <>
      {Array.from({
        length: 5,
      }).map((_, rowIndex) => (
        <TableRow key={rowIndex}>
          {widths.map((width, index) => (
            <TableCell key={index}>
              <Skeleton
                className={`h-5 ${width} ${index >= 7 ? 'mx-auto' : ''}`}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*                                Empty State                                 */
/* -------------------------------------------------------------------------- */

function EmptyApiKeys({ onCreate }: { onCreate: () => void }) {
  return (
    <TableRow>
      <TableCell colSpan={API_KEY_TABLE_COLUMNS} className="h-20 text-center">
        <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
          <p className="font-medium">No API keys yet</p>
        </div>
      </TableCell>
    </TableRow>
  )
}

/* -------------------------------------------------------------------------- */
/*                                API Key Row                                 */
/* -------------------------------------------------------------------------- */

type ApiKeyRowProps = {
  item: T_ProjectApiKey
  onViewScript: (apiKey: string) => void
  onDeactivate: (item: T_ProjectApiKey) => void
}

function ApiKeyRow({ item, onViewScript, onDeactivate }: ApiKeyRowProps) {
  const isRevoked = Boolean(item.revokedAt)

  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!item.secret) return
    try {
      await navigator.clipboard.writeText(item.secret)

      setCopied(true)

      toast.success('API key copied successfully')

      window.setTimeout(() => {
        setCopied(false)
      }, 1500)
    } catch {
      toast.error('Failed to copy API key')
    }
  }

  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{item.name}</p>
      </TableCell>

      <TableCell>
        <ApiKeyStatus revoked={isRevoked} />
      </TableCell>

      <TableCell>
        {mask(item.secret!)}

        <Button onClick={handleCopy} size="icon-xs" variant={'ghost'}>
          {copied ? (
            <CheckIcon key="check" className="copy-icon-animate" />
          ) : (
            <CopyIcon key="copy" className="copy-icon-animate" />
          )}
        </Button>
      </TableCell>

      <TableCell>
        <ScopeBadges scopes={item.scopes} />
      </TableCell>

      <TableCell className="text-muted-foreground">
        {item.lastUsedAt ? formatRelativeTime(item.lastUsedAt) : 'Never'}
      </TableCell>

      <TableCell className="text-muted-foreground">
        {item.expiresAt ? formatRelativeTime(item.expiresAt) : 'Never'}
      </TableCell>

      <TableCell className="text-muted-foreground">
        {formatRelativeTime(item.createdAt)}
      </TableCell>

      <TableCell className="w-30 text-center">
        <Button
          disabled={isRevoked}
          variant="outline"
          size="sm"
          onClick={() => {
            onViewScript(item.secret!)
          }}
        >
          View Script
        </Button>
      </TableCell>

      <TableCell className="w-20 text-center">
        <ApiKeyActions
          disabled={isRevoked}
          onDeactivate={() => {
            onDeactivate(item)
          }}
        />
      </TableCell>
    </TableRow>
  )
}

/* -------------------------------------------------------------------------- */
/*                                Key Status                                  */
/* -------------------------------------------------------------------------- */

function ApiKeyStatus({ revoked }: { revoked: boolean }) {
  return (
    <div className="group flex items-center gap-2" data-revoked={revoked}>
      <span className="bg-primary group-data-[revoked=true]:bg-muted-foreground/50 size-1.5 shrink-0" />

      <span className="text-primary group-data-[revoked=true]:text-muted-foreground">
        {revoked ? 'Inactive' : 'Active'}
      </span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*                               Scope Badges                                 */
/* -------------------------------------------------------------------------- */

function ScopeBadges({ scopes }: { scopes: string[] }) {
  if (!scopes.length) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <DotSeparator className="flex flex-wrap">
      {scopes.map((scope) => (
        <DotSeparatorItem key={scope}>
          <Badge variant="secondary">{capitalizeFirstLetter(scope)}</Badge>
        </DotSeparatorItem>
      ))}
    </DotSeparator>
  )
}

/* -------------------------------------------------------------------------- */
/*                               Key Actions                                  */
/* -------------------------------------------------------------------------- */

type ApiKeyActionsProps = {
  disabled: boolean
  onDeactivate: () => void
}

function ApiKeyActions({ disabled, onDeactivate }: ApiKeyActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button disabled={disabled} size="icon" variant="outline" />}
      >
        <EllipsisIcon />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          onClick={(event) => {
            event.stopPropagation()
            onDeactivate()
          }}
        >
          Deactivate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* -------------------------------------------------------------------------- */
/*                                Main Dialog                                 */
/* -------------------------------------------------------------------------- */

type ApiKeyDialogProps = {
  projectId: string
  state: ApiKeyDialogState
  onClose: () => void
}

function ApiKeyDialog({ projectId, state, onClose }: ApiKeyDialogProps) {
  const isScript = state?.type === 'script'

  return (
    <Dialog
      open={Boolean(state)}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent className={isScript ? 'max-w-fit!' : 'sm:max-w-lg'}>
        {state?.type === 'create' && (
          <CreateApiKeyForm
            projectId={projectId}
            onCancel={onClose}
            onSuccess={onClose}
          />
        )}

        {state?.type === 'script' && <ScriptPreview apiKey={state.apiKey} />}

        {state?.type === 'deactivate' && (
          <DeactivateApiKey
            projectId={projectId}
            id={state.id}
            name={state.name}
            onCancel={onClose}
            onSuccess={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/* -------------------------------------------------------------------------- */
/*                            Create API Key                                  */
/* -------------------------------------------------------------------------- */

type CreateApiKeyFormProps = {
  projectId: string
  onCancel: () => void
  onSuccess: () => void
}

function CreateApiKeyForm({
  projectId,
  onCancel,
  onSuccess,
}: CreateApiKeyFormProps) {
  const { mutate, isPending } = useCreateProjectApiKey(projectId)

  const form = useForm({
    defaultValues: {
      name: 'New Key',
      expiresAt: null as Date | null,

      // All enabled by default.
      // Events must always remain present.
      scopes: trackingOptions.map((option) => option.name) as TrackingScope[],
    },

    onSubmit: async ({ value }) => {
      /*
       * Protect required scopes at payload level too.
       *
       * Even if future UI changes accidentally remove
       * events, the API will always receive it.
       */
      const scopes = Array.from(
        new Set<TrackingScope>(['events', ...value.scopes])
      )

      mutate(
        {
          name: value.name.trim(),
          expiresAt: value.expiresAt ? value.expiresAt.toISOString() : null,
          scopes,
        },
        {
          onSuccess: () => {
            form.reset()
            onSuccess()
          },
        }
      )
    },
  })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()

        void form.handleSubmit()
      }}
    >
      <DialogHeader>
        <DialogTitle>New API Key</DialogTitle>

        <DialogDescription>
          Create a new API key for your project.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-5">
        <FieldSet className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
          {/* Name */}
          <form.Field
            name="name"
            validators={{
              onChange: ({ value }) => {
                if (!value.trim()) {
                  return 'Key name is required.'
                }

                if (value.trim().length < 2) {
                  return 'Key name must be at least 2 characters.'
                }

                return undefined
              },
            }}
          >
            {(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>

                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="Production Key"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                    }}
                    aria-invalid={isInvalid}
                    autoFocus
                  />

                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          </form.Field>

          {/* Expiry */}
          <form.Field name="expiresAt">
            {(field) => (
              <Field>
                <FieldLabel>Expiry Date</FieldLabel>

                <ExpiryDatePicker
                  value={field.state.value}
                  onChange={field.handleChange}
                />
              </Field>
            )}
          </form.Field>
        </FieldSet>

        <Separator />

        {/* Scope */}
        <form.Field name="scopes">
          {(field) => (
            <FieldSet>
              <FieldLegend variant="label">Scope</FieldLegend>

              <FieldDescription>
                Select what this API key is allowed to capture. Events are
                always enabled and cannot be disabled.
              </FieldDescription>

              <ScopeSelector
                value={field.state.value}
                onChange={field.handleChange}
              />
            </FieldSet>
          )}
        </form.Field>
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancel
        </Button>

        <form.Subscribe
          selector={(state) => ({
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ canSubmit, isSubmitting }) => (
            <Button
              type="submit"
              disabled={!canSubmit || isPending || isSubmitting}
            >
              <LoadingSwap isLoading={isPending}>Create Key</LoadingSwap>
            </Button>
          )}
        </form.Subscribe>
      </DialogFooter>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*                            Expiry Date Picker                              */
/* -------------------------------------------------------------------------- */

type ExpiryDatePickerProps = {
  value: Date | null
  onChange: (date: Date | null) => void
}

function ExpiryDatePicker({ value, onChange }: ExpiryDatePickerProps) {
  const today = new Date()

  today.setHours(0, 0, 0, 0)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="min-w-36 justify-start font-normal"
          />
        }
      >
        <CalendarIcon />

        {value ? dateFormatter.format(value) : 'Never'}
      </PopoverTrigger>

      <PopoverContent className="w-fit p-0" align="end">
        <Calendar
          mode="single"
          selected={value ?? undefined}
          onSelect={(date) => {
            onChange(date ?? null)
          }}
          disabled={(date) => date < today}
          captionLayout="dropdown"
        />

        <div className="border-t p-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={!value}
            onClick={() => {
              onChange(null)
            }}
          >
            Never expire
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

/* -------------------------------------------------------------------------- */
/*                              Scope Selector                                */
/* -------------------------------------------------------------------------- */

type ScopeSelectorProps = {
  value: TrackingScope[]
  onChange: (value: TrackingScope[]) => void
}

function ScopeSelector({ value, onChange }: ScopeSelectorProps) {
  const toggleScope = (scope: TrackingScope, checked: boolean) => {
    /*
     * Events is a required scope.
     * Never allow UI interaction to remove it.
     */
    if (scope === 'events') {
      return
    }

    if (checked) {
      if (value.includes(scope)) {
        return
      }

      onChange([...value, scope])

      return
    }

    onChange(value.filter((item) => item !== scope))
  }

  return (
    <FieldGroup className="mt-2 gap-2">
      {trackingOptions.map((option) => {
        const isRequired = option.required

        const checked = isRequired || value.includes(option.name)

        return (
          <Field
            key={option.name}
            orientation="horizontal"
            className="hover:bg-muted/50 rounded-md border p-3 transition-colors"
          >
            <Checkbox
              id={`scope-${option.name}`}
              checked={checked}
              disabled={isRequired}
              onCheckedChange={(checked) => {
                toggleScope(option.name, checked === true)
              }}
            />

            <FieldLabel
              htmlFor={`scope-${option.name}`}
              className="flex-1 cursor-pointer font-normal"
            >
              <span className="flex w-full items-center justify-between gap-4">
                <span className="space-y-0.5">
                  <span className="block text-sm font-medium">
                    {option.label}
                  </span>

                  <span className="text-muted-foreground block text-xs font-normal">
                    {option.description}
                  </span>
                </span>

                {isRequired && (
                  <Badge variant="secondary" className="shrink-0">
                    Required
                  </Badge>
                )}
              </span>
            </FieldLabel>
          </Field>
        )
      })}
    </FieldGroup>
  )
}

/* -------------------------------------------------------------------------- */
/*                          Deactivate API Key                                */
/* -------------------------------------------------------------------------- */

type DeactivateApiKeyProps = {
  projectId: string
  id: string
  name: string
  onCancel: () => void
  onSuccess: () => void
}

function DeactivateApiKey({
  projectId,
  id,
  name,
  onCancel,
  onSuccess,
}: DeactivateApiKeyProps) {
  const { mutate, isPending } = useRevokeProjectApiKey(projectId)

  return (
    <>
      <DialogHeader>
        <DialogTitle>Deactivate API Key</DialogTitle>

        <DialogDescription>
          Deactivating{' '}
          <span className="text-foreground font-medium">{name}</span> will
          prevent it from being used by your integrations.
        </DialogDescription>
      </DialogHeader>

      <DialogFooter className="pt-4">
        <Button variant="secondary" disabled={isPending} onClick={onCancel}>
          Cancel
        </Button>

        <Button
          variant="destructive"
          disabled={isPending}
          onClick={() => {
            mutate(id, {
              onSuccess,
            })
          }}
        >
          <LoadingSwap isLoading={isPending}>Deactivate</LoadingSwap>
        </Button>
      </DialogFooter>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*                              Script Preview                                */
/* -------------------------------------------------------------------------- */

function ScriptPreview({ apiKey }: { apiKey: string }) {
  const [activeIntegration, setActiveIntegration] = useState('html')

  const [copied, setCopied] = useState(false)

  const [masked, setMasked] = useState(true)

  const integration =
    integrations.find((item) => item.id === activeIntegration) ??
    integrations[0]!

  const actualCode = integration.code.replace('plk_********', apiKey)

  const previewCode = integration.code.replace(
    'plk_********',
    masked ? mask(apiKey) : apiKey
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(actualCode)

      setCopied(true)

      toast.success('Script copied successfully')

      window.setTimeout(() => {
        setCopied(false)
      }, 1500)
    } catch {
      toast.error('Failed to copy script')
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Integration Script</DialogTitle>

        <DialogDescription>
          Paste this script into your project to start sending data.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 pt-2">
        <IntegrationSelector
          value={activeIntegration}
          onChange={setActiveIntegration}
        />

        <div className="w-[min(42rem,calc(100vw-3rem))] overflow-hidden border-2 border-dashed">
          <div className="bg-input/20 flex items-center justify-between border-b-2 border-dashed px-4 py-2">
            <div className="flex min-w-0 items-center gap-1">
              <span className="size-3 shrink-0 rounded-full bg-red-400" />
              <span className="size-3 shrink-0 rounded-full bg-yellow-400" />
              <span className="size-3 shrink-0 rounded-full bg-green-400" />

              <span className="text-muted-foreground ml-2 truncate text-xs">
                {integration.filename}
              </span>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                title={masked ? 'Show API key' : 'Hide API key'}
                onClick={() => {
                  setMasked((current) => !current)
                }}
              >
                {masked ? (
                  <EyeIcon key="show" className="copy-icon-animate" />
                ) : (
                  <EyeOffIcon key="hide" className="copy-icon-animate" />
                )}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="icon"
                title="Copy script"
                onClick={handleCopy}
              >
                {copied ? (
                  <CheckIcon key="check" className="copy-icon-animate" />
                ) : (
                  <CopyIcon key="copy" className="copy-icon-animate" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-background max-h-80 overflow-auto">
            <CodeBlock code={previewCode} language={integration.language} />
          </div>
        </div>
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*                          Integration Selector                              */
/* -------------------------------------------------------------------------- */

type IntegrationSelectorProps = {
  value: string
  onChange: (value: string) => void
}

export function IntegrationSelector({
  value,
  onChange,
}: IntegrationSelectorProps) {
  return (
    <div className="mx-auto flex w-fit items-center rounded-full border p-1">
      {integrations.map((item) => {
        const active = value === item.id

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onChange(item.id)
            }}
            className="hover:bg-secondary relative cursor-pointer rounded-full px-4 py-2 text-sm transition-colors"
          >
            {active && (
              <motion.div
                layoutId="active-integration-tab-pill"
                className="bg-primary absolute inset-0 rounded-full"
                transition={{
                  type: 'spring',
                  stiffness: 380,
                  damping: 30,
                }}
              />
            )}

            <span
              className={`relative z-10 transition-colors ${
                active ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
