import { getWorkspacesOptions, type T_Workspace } from '@/queries/workspace'
import { formatDate } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { EllipsisIcon, PlusIcon, SearchIcon } from 'lucide-react'
import React from 'react'
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
import { Input } from '@workspace/ui/components/input'
import { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { useCreateWorkspace, useDeleteWorkspace } from '@/mutations/workspace'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { Badge } from '@workspace/ui/components/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'

const formSchema = z.object({
  workspace_name: z
    .string()
    .min(2, {
      error: 'Workspace name must be at least 2 characters.',
    })
    .max(50, {
      error: 'Workspace name must be at most 50 characters.',
    }),
})

export const Route = createFileRoute('/app/(entry)/')({
  component: RouteComponent,
  validateSearch: z.object({ create: z.boolean().default(false) }),
})

function RouteComponent() {
  const { create } = Route.useSearch()
  const navigate = useNavigate()

  const [open, setOpen] = React.useState(create)
  const [deleteOpen, setDeleteOpen] = React.useState<string | null>(null)

  const { data: workspaceData, isLoading: workspaceDataLoading } = useQuery(
    getWorkspacesOptions()
  )
  const createWorkspace = useCreateWorkspace()
  const deleteWorkspace = useDeleteWorkspace()

  const form = useForm({
    defaultValues: {
      workspace_name: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value: { workspace_name } }) => {
      createWorkspace.mutate(
        { name: workspace_name },
        {
          onSuccess: () => {
            setOpen(false)
            navigate({
              to: '/app',
              search: {
                create: false,
              },
              replace: true,
            })
            form.reset()
          },
        }
      )
    },
  })

  return (
    <div>
      <Dialog
        open={open}
        onOpenChange={(open) => {
          setOpen(open)
          setDeleteOpen(null)
          navigate({
            to: '/app',
            search: {
              create: false,
            },
            replace: true,
          })
        }}
      >
        <div className="mx-auto max-w-4xl pt-10">
          <div className="space-y-5">
            <p className="text-2xl font-semibold">Your Workspaces</p>

            <div className="space-y-5">
              <div className="flex items-center justify-between gap-4">
                <InputGroup>
                  <InputGroupButton>
                    <SearchIcon />
                  </InputGroupButton>
                  <InputGroupInput placeholder="Search..." />
                </InputGroup>

                <DialogTrigger render={<Button />}>
                  <PlusIcon />
                  New Workspace
                </DialogTrigger>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-24 text-center">
                        Projects
                      </TableHead>
                      <TableHead className="w-24 text-center">
                        Members
                      </TableHead>
                      <TableHead className="w-32 text-center">
                        Created at
                      </TableHead>
                      <TableHead className="w-20 text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {workspaceDataLoading
                      ? [...Array(5)].map((_, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Skeleton className="h-6 w-50" />
                            </TableCell>

                            <TableCell>
                              <div className="flex justify-center">
                                <Skeleton className="h-6 w-12" />
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex justify-center">
                                <Skeleton className="h-6 w-12" />
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex justify-center">
                                <Skeleton className="h-6 w-20" />
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex justify-center">
                                <Skeleton className="h-8 w-8" />
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      : workspaceData?.data?.map((item) => (
                          <WorkspaceCard
                            key={item.id}
                            setOpen={setOpen}
                            setDeleteOpen={setDeleteOpen}
                            item={item}
                          />
                        ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>

        {deleteOpen ? (
          <DialogContent showCloseButton={false}>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this workspace?
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="bg-transparent py-2">
              <DialogClose render={<Button variant="ghost">Cancel</Button>}>
                Close
              </DialogClose>
              <Button
                onClick={() => {
                  deleteWorkspace.mutate(deleteOpen, {
                    onSuccess: () => {
                      setOpen(false)
                    },
                  })
                }}
                variant="destructive"
              >
                <LoadingSwap isLoading={deleteWorkspace.isPending}>
                  Delete
                </LoadingSwap>
              </Button>
            </DialogFooter>
          </DialogContent>
        ) : (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workspace</DialogTitle>
            </DialogHeader>

            <form
              id="new-workspace-form"
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <FieldGroup className="flex flex-col gap-5 lg:gap-4">
                <form.Field
                  name="workspace_name"
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
                          placeholder="Acme Corp"
                          maxLength={50}
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                />
              </FieldGroup>
            </form>

            <DialogFooter className="bg-transparent py-2">
              <DialogClose render={<Button variant={'outline'} />}>
                Cancel
              </DialogClose>
              <Button type="submit" form="new-workspace-form">
                <LoadingSwap isLoading={createWorkspace.isPending}>
                  Create
                </LoadingSwap>
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

const WorkspaceCard = ({
  item,
  setOpen,
  setDeleteOpen,
}: {
  item: T_Workspace
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
  setDeleteOpen: React.Dispatch<React.SetStateAction<string | null>>
}) => {
  const navigate = useNavigate()

  const workspaceMenuItems = [
    {
      label: 'View',
      action: 'view',
      onClick: () => {
        navigate({
          to: '/app/$workspaceId',
          params: {
            workspaceId: item.id,
          },
        })
      },
      display: true,
    },
    {
      label: 'Settings',
      action: 'settings',
      onClick: () => {
        navigate({
          to: '/app/$workspaceId/settings',
          params: {
            workspaceId: item.id,
          },
        })
      },
      display: true,
    },
    {
      label: 'Delete',
      action: 'delete',
      variant: 'destructive' as const,
      separatorBefore: true,
      display: !item.isDefault && item.permissions.includes('workspace.delete'),
      onClick: () => {
        setOpen(true)
        setDeleteOpen(item.id)
      },
    },
  ]

  return (
    <TableRow
      onClick={() => {
        navigate({
          to: '/app/$workspaceId',
          params: {
            workspaceId: item.id,
          },
        })
      }}
      className="hover:bg-card/40 cursor-pointer"
    >
      <TableCell>
        <div className="flex items-center gap-2 overflow-hidden">
          <Link
            to="/app/$workspaceId"
            params={{
              workspaceId: item.id,
            }}
            className="truncate text-sm underline"
          >
            {item.name}
          </Link>

          {item.external ? (
            <Badge variant="outline" className="text-muted-foreground">
              External
            </Badge>
          ) : (
            item.isDefault && (
              <Badge variant="outline" className="text-muted-foreground">
                Default
              </Badge>
            )
          )}
        </div>
      </TableCell>

      <TableCell className="w-24 text-center">{item.projectCount}</TableCell>

      <TableCell className="w-24 text-center">{item.memberCount}</TableCell>

      <TableCell className="w-32 text-center whitespace-nowrap">
        {formatDate(item.createdAt)}
      </TableCell>

      <TableCell className="w-20 text-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                }}
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            {workspaceMenuItems.map(
              (menuItem) =>
                menuItem.display && (
                  <React.Fragment key={menuItem.action}>
                    {menuItem.separatorBefore && <DropdownMenuSeparator />}

                    <DropdownMenuItem
                      variant={menuItem.variant}
                      render={
                        <Button
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
                )
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
