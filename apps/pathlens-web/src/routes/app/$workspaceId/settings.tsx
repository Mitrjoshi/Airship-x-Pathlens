import {
  useDeleteWorkspace,
  useRevokeWorkspaceInvitation,
  useUpdateWorkspace,
} from '@/mutations/workspace'
import {
  getWorkspaceByIdOptions,
  getWorkspaceInvitationsOptions,
} from '@/queries/workspace'
import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { AlertTriangleIcon, ArrowUpRightIcon } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

const schema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(120, 'Name must be 120 chars'),
})

export const Route = createFileRoute('/app/$workspaceId/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId } = Route.useParams()
  const [open, setOpen] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading } = useQuery(getWorkspaceByIdOptions(workspaceId))
  const { mutate, isPending } = useRevokeWorkspaceInvitation(workspaceId)
  const { mutate: deleteWorkspace, isPending: deletePending } =
    useDeleteWorkspace()
  const { mutate: updateWorkspace, isPending: updatePending } =
    useUpdateWorkspace(workspaceId)
  const {
    data: invitationsData,
    isPending: invitationsPending,
    // isError: invitationsError,
  } = useQuery(getWorkspaceInvitationsOptions(workspaceId))

  const workspaceData = data?.data
  const invitations = invitationsData?.data

  const form = useForm({
    defaultValues: {
      name: workspaceData?.name ?? '',
    },
    validators: {
      onSubmit: schema,
    },
    onSubmit: ({ value }) => {
      updateWorkspace({ name: value.name })
    },
  })

  const deleteForm = useForm({
    defaultValues: {
      confirmation: '',
    },

    validators: {
      onSubmit: ({ value }) => {
        if (!value.confirmation) {
          return {
            fields: {
              confirmation: {
                message: 'Workspace name is required.',
              },
            },
          }
        }

        if (value.confirmation !== workspaceData?.name) {
          return {
            fields: {
              confirmation: {
                message: `Please type ${workspaceData?.name} exactly as shown.`,
              },
            },
          }
        }

        return undefined
      },
    },

    onSubmit: async () => {
      if (!deleteId) return

      deleteWorkspace(deleteId)
    },
  })

  if (isLoading) {
    return (
      <div>
        <div className="mx-auto max-w-4xl space-y-4 pt-10">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <div className="mx-auto max-w-4xl pt-10">
          <div className="space-y-5">
            <div>
              <p className="text-2xl font-medium">Workspace Settings</p>
              <p className="text-muted-foreground text-sm">
                This is the default workspace. You cannot edit the name or
                delete it.
              </p>
            </div>

            <Card className="bg-card/30 rounded-none border-2 border-dashed">
              <CardContent>
                <form
                  id="workspace-name"
                  onSubmit={(e) => {
                    e.preventDefault()
                    form.handleSubmit()
                  }}
                >
                  <FieldGroup>
                    <form.Field
                      name="name"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field
                            orientation={'horizontal'}
                            data-invalid={isInvalid}
                          >
                            <FieldLabel
                              className="text-nowrap"
                              htmlFor={field.name}
                            >
                              Workspace name
                            </FieldLabel>
                            <div className="flex w-full flex-col items-end">
                              <Input
                                id={field.name}
                                disabled={workspaceData?.isDefault}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                aria-invalid={isInvalid}
                                placeholder="Workspace Name"
                                autoComplete="off"
                                className="w-[50%]"
                              />

                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </div>
                          </Field>
                        )
                      }}
                    />
                  </FieldGroup>
                </form>
              </CardContent>
              <CardFooter className="justify-end rounded-none border-t-2 border-dashed bg-transparent py-2">
                <Button
                  disabled={workspaceData?.isDefault}
                  form="workspace-name"
                  type="submit"
                >
                  <LoadingSwap isLoading={updatePending}>
                    Save Changes
                  </LoadingSwap>
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-card/30 rounded-none border-2 border-dashed">
              <CardHeader className="flex gap-4">
                <CardTitle>
                  Pending Invitations ({invitations?.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-100 overflow-auto">
                {invitationsData?.data.length ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead className="w-40 text-center">Role</TableHead>
                        <TableHead className="w-40 text-center">
                          Access profile
                        </TableHead>
                        <TableHead className="w-40 text-center">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitationsPending
                        ? [...Array(5)].map((_, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <Skeleton className="h-6 w-50" />
                              </TableCell>

                              <TableCell>
                                <div className="flex justify-center">
                                  <Skeleton className="h-6 w-30" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex justify-center">
                                  <Skeleton className="h-6 w-30" />
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex justify-center">
                                  <Skeleton className="h-6 w-30" />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        : invitationsData?.data?.map((item) => (
                            <TableRow key={item.id ?? item.email}>
                              <TableCell>
                                <div className="max-w-80 overflow-hidden">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <p className="truncate text-sm font-medium">
                                      {item.name}
                                    </p>
                                  </div>

                                  <p className="text-muted-foreground truncate text-xs">
                                    {item.email}
                                  </p>
                                </div>
                              </TableCell>

                              <TableCell className="text-center">
                                {item.role}
                              </TableCell>

                              <TableCell className="text-center">
                                <Button
                                  className={'text-foreground'}
                                  variant="link"
                                  render={
                                    <Link
                                      to="/app/$workspaceId/permissions/$permissionId"
                                      params={{
                                        workspaceId,
                                        permissionId: item.permissionProfileId!,
                                      }}
                                    />
                                  }
                                >
                                  {item.permissionProfileName}
                                  <ArrowUpRightIcon />
                                </Button>
                              </TableCell>

                              <TableCell className="text-center">
                                <Button
                                  onClick={() => {
                                    setRevokeId(item.id)
                                    setOpen(true)
                                  }}
                                  variant={'destructive'}
                                >
                                  Revoke
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center text-sm">
                    No pending invitations
                  </p>
                )}
              </CardContent>
            </Card>

            {workspaceData?.isDefault ? (
              <p className="text-muted-foreground text-center text-sm">
                This is the default workspace. You cannot delete it.
              </p>
            ) : (
              <Card className="bg-destructive/2 border-destructive/50 rounded-none border-2 border-dashed">
                <CardHeader className="flex gap-4">
                  <AlertTriangleIcon className="text-destructive" />
                  <div>
                    <CardTitle>
                      Deleting this workspace will also remove its projects
                    </CardTitle>
                    <CardDescription>
                      Make sure you have made a backup of your projects if you
                      want to keep your data
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardFooter className="border-destructive/50 justify-end rounded-none border-t-2 border-dashed bg-transparent py-2">
                  <Button
                    onClick={() => {
                      setDeleteId(workspaceData?.id as string)
                      setOpen(true)
                    }}
                    variant={'destructive'}
                  >
                    Delete Workspace
                  </Button>
                </CardFooter>
              </Card>
            )}
          </div>
        </div>

        {revokeId && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke Invitation</DialogTitle>
              <DialogDescription>
                Are you sure you want to revoke this invitation? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="py-2">
              <DialogClose>
                <Button variant={'secondary'}>Cancel</Button>
              </DialogClose>
              <Button
                onClick={() =>
                  mutate(revokeId, {
                    onSuccess: () => setOpen(false),
                  })
                }
                variant={'destructive'}
              >
                <LoadingSwap isLoading={isPending}>Confirm</LoadingSwap>
              </Button>
            </DialogFooter>
          </DialogContent>
        )}

        {deleteId && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Workspace</DialogTitle>
            </DialogHeader>

            <form
              id="delete-workspace-form"
              onSubmit={(e) => {
                e.preventDefault()
                deleteForm.handleSubmit()
              }}
            >
              <FieldGroup>
                <deleteForm.Field
                  name="confirmation"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid

                    return (
                      <Field className="gap-2">
                        <FieldLabel
                          htmlFor={field.name}
                          className="text-muted-foreground inline"
                        >
                          Enter{' '}
                          <span className="text-foreground inline">
                            {workspaceData?.name}
                          </span>{' '}
                          to confirm workspace deletion
                        </FieldLabel>

                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder={workspaceData?.name}
                          autoComplete="off"
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
              <DialogClose render={<Button variant="secondary" />}>
                Cancel
              </DialogClose>

              <Button
                form="delete-workspace-form"
                type="submit"
                variant="destructive"
                disabled={deletePending}
              >
                <LoadingSwap isLoading={deletePending}>Confirm</LoadingSwap>
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
