import { createFileRoute } from '@tanstack/react-router'
import { getWorkspaceByIdOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { NoPermissionView } from './-components/common/no-permission-view'
import { motion } from 'motion/react'
import VisitorsLoading from './-components/common/visitors-loading'
import { Button } from '@workspace/ui/components/button'
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
  CalendarIcon,
  CheckIcon,
  CopyIcon,
  EllipsisIcon,
  EyeClosedIcon,
  EyeIcon,
  PlusIcon,
} from 'lucide-react'
import {
  getProjectApiKeysOptions,
  type T_ProjectApiKey,
} from '@/queries/api-keys'
import { capitalizeFirstLetter, formatRelativeTime, mask } from '@/utils/utils'
import { DotSeparator, DotSeparatorItem } from '../../-components/dot-separator'
import { Badge } from '@workspace/ui/components/badge'
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
import React, { useState } from 'react'
import {
  CodeBlock,
  integrations,
} from '@/routes/(open)/-components/few-lines-of-code'
import { toast } from 'sonner'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  useCreateProjectApiKey,
  useRevokeProjectApiKey,
} from '@/mutations/api-keys'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { Calendar } from '@workspace/ui/components/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { Separator } from '@workspace/ui/components/separator'
import { useForm } from '@tanstack/react-form'
import type { TrackingScope } from '@workspace/contracts'

const trackingOptions = [
  {
    name: 'replay' as const,
    label: 'Session Replay',
    description: 'Reconstruct the path visitors take through your site.',
    detail: 'Mask inputs and sensitive text when needed.',
  },
  {
    name: 'performance' as const,
    label: 'Performance Metrics',
    description: 'Understand how quickly pages load for real visitors.',
    detail: 'Track timing across devices and browsers.',
  },
  {
    name: 'errors' as const,
    label: 'Error Tracking',
    description: 'Capture uncaught errors and rejected promises.',
    detail: 'Find technical friction alongside behavior.',
  },
] as const

export const Route = createFileRoute('/app/$workspaceId/$projectId/api-keys')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const [activeIntegration, setActiveIntegration] = useState('html')
  const integration =
    integrations.find((item) => item.id === activeIntegration) ??
    integrations[0]
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [maskApiKey, setMaskApiKey] = useState(true)

  const { data, isLoading } = useQuery(getWorkspaceByIdOptions(workspaceId))
  const { mutate, isPending } = useCreateProjectApiKey(projectId)
  const { mutate: mutateRevoke, isPending: revokePending } =
    useRevokeProjectApiKey(projectId)
  const { data: keysData, isLoading: keysLoading } = useQuery(
    getProjectApiKeysOptions(projectId)
  )

  const form = useForm({
    defaultValues: {
      name: 'New Key',
      expiresAt: null as Date | null,
      scopes: trackingOptions.map((option) => option.name),
    },

    onSubmit: async ({ value }) => {
      mutate(
        {
          name: value.name,
          expiresAt: value.expiresAt ? value.expiresAt.toISOString() : null,
          scopes: value.scopes as TrackingScope[],
        },
        {
          onSuccess: () => {
            setOpen(false)
            form.reset()
          },
        }
      )
    },
  })

  if (isLoading) {
    return <VisitorsLoading />
  }

  if (!data?.data.permissions.includes('project.api_keys.view')) {
    return <NoPermissionView />
  }

  return (
    <div className="space-y-6 p-6">
      <Dialog
        open={open}
        onOpenChange={setOpen}
        onOpenChangeComplete={(open) => {
          if (!open) {
            setApiKey('')
          }
        }}
      >
        {/* Heading */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-medium">API Keys</p>

            <p className="text-muted-foreground text-sm">
              View and monitor all events captured across your project.
            </p>
          </div>

          <Button onClick={() => setOpen(true)}>
            <PlusIcon />
            New API Key
          </Button>
        </div>

        <div className="border">
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
                <TableHead className="w-30 text-center">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {keysLoading
                ? [...Array(5)].map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-48" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-14" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-24" />
                      </TableCell>

                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>

                      <TableCell className="w-30 justify-center">
                        <Skeleton className="mx-auto h-8 w-8 rounded-md" />
                      </TableCell>

                      <TableCell className="w-30 justify-center">
                        <Skeleton className="mx-auto h-8 w-8 rounded-md" />
                      </TableCell>
                    </TableRow>
                  ))
                : keysData?.data?.map((item) => (
                    <ApiKeyRow
                      setOpen={setOpen}
                      setApiKey={setApiKey}
                      item={item}
                      setDeleteId={setDeleteId}
                    />
                  ))}

              {!keysLoading && !keysData?.data?.length && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <p className="text-muted-foreground text-sm">
                      No events found.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <DialogContent className={'max-w-fit!'}>
          {apiKey ? (
            <>
              <DialogHeader>
                <DialogTitle>Script</DialogTitle>
                <DialogDescription>
                  Paste the following script into your project.
                </DialogDescription>
              </DialogHeader>

              <div className="mx-auto flex w-fit items-center justify-center rounded-full border p-1">
                {integrations.map((item) => {
                  const isActive = activeIntegration === item.id

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveIntegration(item.id)}
                      className="hover:bg-secondary relative cursor-pointer rounded-full px-4 py-2 duration-150"
                    >
                      {isActive && (
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
                        className={`relative z-10 transition-colors duration-200 ${
                          isActive ? 'text-black' : 'text-muted-foreground'
                        }`}
                      >
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className="mx-auto max-w-2xl border-2 border-dashed">
                <div className="bg-input/20 flex items-center justify-between border-b-2 border-dashed px-4 py-2">
                  <div className="flex items-center gap-1">
                    <span className="size-3 rounded-full bg-red-400" />
                    <span className="size-3 rounded-full bg-yellow-400" />
                    <span className="size-3 rounded-full bg-green-400" />

                    <span className="text-muted-foreground ml-2 text-xs">
                      {integration.filename}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      onClick={async () => {
                        setMaskApiKey(!maskApiKey)
                      }}
                      variant="secondary"
                      size="icon"
                    >
                      {!maskApiKey ? (
                        <EyeIcon key="mask-off" className="copy-icon-animate" />
                      ) : (
                        <EyeClosedIcon
                          key="mask-on"
                          className="copy-icon-animate"
                        />
                      )}
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          const code = integration.code.replace(
                            'plk_********',
                            mask(apiKey)
                          )

                          await navigator.clipboard.writeText(code)

                          setCopied(true)
                          toast.success('Script copied successfully')

                          setTimeout(() => {
                            setCopied(false)
                          }, 1500)
                        } catch {
                          toast.error('Failed to copy script')
                        }
                      }}
                      variant="secondary"
                      size="icon"
                    >
                      {copied ? (
                        <CheckIcon key="check" className="copy-icon-animate" />
                      ) : (
                        <CopyIcon key="copy" className="copy-icon-animate" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-background max-h-70 w-150 overflow-auto">
                  <CodeBlock
                    code={
                      maskApiKey
                        ? integration.code.replace('plk_********', mask(apiKey))
                        : integration.code.replace('plk_********', apiKey)
                    }
                    language={integration.language}
                  />
                </div>
              </div>
            </>
          ) : deleteId ? (
            <>
              <DialogHeader>
                <DialogTitle>Deactivate Key</DialogTitle>
                <DialogDescription>
                  Are you sure you want to deactivate this key?
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <DialogFooter className="py-2">
                  <DialogClose>
                    <Button variant={'secondary'}>Cancel</Button>
                  </DialogClose>
                  <Button
                    variant={'destructive'}
                    onClick={() => {
                      mutateRevoke(deleteId, {
                        onSuccess: () => {
                          setOpen(false)
                        },
                      })
                    }}
                  >
                    <LoadingSwap isLoading={revokePending}>Confirm</LoadingSwap>
                  </Button>
                </DialogFooter>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>New Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for your project
                </DialogDescription>
              </DialogHeader>

              <div className="w-sm">
                <FieldGroup>
                  <Field>
                    <FieldLabel>Name</FieldLabel>
                    <Input placeholder="New Key" />
                  </Field>
                  <Field orientation={'horizontal'}>
                    <FieldLabel>Expiry Date</FieldLabel>
                    <Popover>
                      <PopoverTrigger render={<Button variant={'outline'} />}>
                        <CalendarIcon />
                        Never
                      </PopoverTrigger>
                      <PopoverContent className={'w-fit'} align="center">
                        <Calendar
                          mode="single"
                          className="p-0"
                          captionLayout="dropdown"
                        />
                      </PopoverContent>
                    </Popover>
                  </Field>

                  <Separator />

                  <FieldSet>
                    <FieldLegend variant="label">Scope</FieldLegend>
                    <FieldDescription>
                      Select the scope of this key.
                    </FieldDescription>

                    <FieldGroup className="gap-3">
                      {trackingOptions.map((option) => (
                        <Field orientation="horizontal">
                          <Checkbox
                            id={option.name}
                            name={option.name}
                            defaultChecked
                          />
                          <FieldLabel
                            htmlFor={option.name}
                            className="font-normal"
                          >
                            {option.label}
                          </FieldLabel>
                        </Field>
                      ))}
                    </FieldGroup>
                  </FieldSet>
                </FieldGroup>
              </div>

              <DialogFooter className="py-2">
                <DialogClose>
                  <Button variant={'secondary'}>Cancel</Button>
                </DialogClose>
                <Button
                  onClick={() => {
                    mutate(
                      {
                        name: 'New Key',
                        expiresAt: null,
                        scopes: ['events'],
                      },
                      {
                        onSuccess: () => {
                          setOpen(false)
                        },
                      }
                    )
                  }}
                >
                  <LoadingSwap isLoading={isPending}>Create</LoadingSwap>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const ApiKeyRow = ({
  item,
  setApiKey,
  setOpen,
  setDeleteId,
}: {
  item: T_ProjectApiKey
  setApiKey: React.Dispatch<React.SetStateAction<string>>
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDeleteId: React.Dispatch<React.SetStateAction<string | null>>
}) => {
  const workspaceMenuItems = [
    {
      label: 'Edit',
      action: 'edit',
      onClick: () => {},
      active: item.revokedAt ? false : true,
    },
    {
      label: 'Deactivate',
      action: 'deactivate',
      variant: 'destructive' as const,
      separatorBefore: true,
      active: item.revokedAt ? false : true,
      onClick: () => {
        setDeleteId(item.id)
        setOpen(true)
      },
    },
  ]

  return (
    <TableRow key={item.id}>
      <TableCell>{item.name}</TableCell>
      <TableCell className="group" data-revoked={Boolean(item.revokedAt)}>
        <p className="text-primary group-data-[revoked=true]:text-muted-foreground/75 flex items-center gap-2">
          <span className="bg-primary group-data-[revoked=true]:bg-muted-foreground/75 aspect-square h-1.5 w-1.5" />

          {item.revokedAt ? 'Inactive' : 'Active'}
        </p>
      </TableCell>
      <TableCell>{mask(item.secret!)}</TableCell>
      <TableCell>
        <DotSeparator className="flex">
          {item.scopes.map((item, index) => (
            <DotSeparatorItem key={index}>
              <Badge variant="secondary">{capitalizeFirstLetter(item)}</Badge>
            </DotSeparatorItem>
          ))}
        </DotSeparator>
      </TableCell>
      <TableCell>
        {item.lastUsedAt ? formatRelativeTime(item.lastUsedAt) : '-'}
      </TableCell>
      <TableCell>
        {item.expiresAt ? formatRelativeTime(item.expiresAt) : '-'}
      </TableCell>
      <TableCell>{formatRelativeTime(item.createdAt)}</TableCell>

      <TableCell className="w-30 text-center">
        <DialogTrigger
          render={
            <Button
              disabled={!!item.revokedAt}
              onClick={() => {
                setApiKey(item.secret!)
                setOpen(true)
              }}
              variant={'outline'}
            />
          }
        >
          View Script
        </DialogTrigger>
      </TableCell>
      <TableCell className="w-30 text-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                disabled={!!item.revokedAt}
                size="icon"
                variant={'outline'}
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            {workspaceMenuItems.map((menuItem) => (
              <React.Fragment key={menuItem.action}>
                {menuItem.separatorBefore && <DropdownMenuSeparator />}

                <DropdownMenuItem
                  variant={menuItem.variant}
                  render={
                    <Button
                      disabled={!menuItem.active}
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={(e) => {
                        e.stopPropagation()
                        menuItem.onClick()
                      }}
                    />
                  }
                >
                  {menuItem.label}
                </DropdownMenuItem>
              </React.Fragment>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
