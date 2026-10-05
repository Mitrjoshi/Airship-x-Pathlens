import {
  getWorkspaceByIdOptions,
  getWorkspacePermissionProfilesOptions,
  type T_PermissionProfile,
} from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { EllipsisIcon, InfoIcon, PlusIcon, SearchIcon } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import {
  PERMISSION_GROUPS,
  type Permission,
  type PermissionDefinition,
} from '@workspace/contracts'
import { Switch } from '@workspace/ui/components/switch'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { Label } from '@workspace/ui/components/label'
import {
  useCreateWorkspacePermissionProfile,
  useDeleteWorkspacePermissionProfile,
  useUpdateWorkspacePermissionProfile,
} from '@/mutations/workspace'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { z } from 'zod'

export const Route = createFileRoute('/app/$workspaceId/permissions/')({
  component: RouteComponent,
  validateSearch: z.object({ create: z.boolean().default(false) }),
})

type PermissionProfileDraft = {
  name: string
  description: string
  permissions: Permission[]
}

type ProfileDialogState =
  | {
      mode: 'create'
    }
  | {
      mode: 'edit'
      profile: T_PermissionProfile
    }
  | null

const createEmptyDraft = (): PermissionProfileDraft => ({
  name: '',
  description: '',
  permissions: [],
})

function RouteComponent() {
  const { workspaceId } = Route.useParams()
  const { create } = Route.useSearch()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [profileDialog, setProfileDialog] = useState<ProfileDialogState>(() =>
    create
      ? {
          mode: 'create',
        }
      : null
  )
  const [deleteOpen, setDeleteOpen] = useState<string | null>(null)

  const {
    data: profilesData,
    isPending: profilesPending,
    isError: profilesError,
  } = useQuery(getWorkspacePermissionProfilesOptions(workspaceId))

  const { data: workspaceData } = useQuery(getWorkspaceByIdOptions(workspaceId))

  const {
    mutate: createPermissionProfile,
    isPending: createPermissionProfilePending,
  } = useCreateWorkspacePermissionProfile(workspaceId)

  const {
    mutate: updatePermissionProfile,
    isPending: updatePermissionProfilePending,
  } = useUpdateWorkspacePermissionProfile(workspaceId)

  const {
    mutate: deletePermissionProfile,
    isPending: deletePermissionProfilePending,
  } = useDeleteWorkspacePermissionProfile(workspaceId)

  const permissions = workspaceData?.data?.permissions ?? []

  const profiles = profilesData?.data ?? []

  const filteredProfiles = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return profiles

    return profiles.filter((profile) => {
      return (
        profile.name.toLowerCase().includes(query) ||
        profile.description?.toLowerCase().includes(query)
      )
    })
  }, [profiles, search])

  const closeProfileDialog = () => {
    setProfileDialog(null)
    navigate({
      to: '/app/$workspaceId/permissions',
      params: { workspaceId },
      search: {
        create: false,
      },
      replace: true,
    })
  }

  const handleProfileSubmit = (draft: PermissionProfileDraft) => {
    if (profileDialog?.mode === 'edit') {
      /*
       * Keeping the same mutation payload shape as your existing page.
       *
       * If your update mutation requires profileId in the payload,
       * add profileDialog.profile.id here.
       */
      updatePermissionProfile(
        {
          payload: draft,
          profileId: profileDialog.profile.id,
        },
        {
          onSuccess: closeProfileDialog,
        }
      )

      return
    }

    createPermissionProfile(draft, {
      onSuccess: closeProfileDialog,
    })
  }

  return (
    <div>
      <div className="mx-auto max-w-4xl pt-10">
        <div className="space-y-5">
          <p className="text-2xl font-medium">Permission Profiles</p>

          {profilesError ? (
            <div className="flex items-center gap-1">
              <InfoIcon size={18} className="text-destructive" />

              <p className="text-destructive">Failed to load profiles</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-4">
                <InputGroup>
                  <InputGroupButton>
                    <SearchIcon />
                  </InputGroupButton>

                  <InputGroupInput
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search..."
                  />
                </InputGroup>

                <Button
                  onClick={() => {
                    setProfileDialog({
                      mode: 'create',
                    })
                  }}
                >
                  <PlusIcon />
                  New Permission
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>

                      <TableHead className="w-32 text-center">
                        Permissions
                      </TableHead>

                      <TableHead className="w-24 text-center">
                        Members
                      </TableHead>

                      <TableHead className="w-20 text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {profilesPending ? (
                      <PermissionTableSkeleton />
                    ) : (
                      filteredProfiles.map((item) => (
                        <PermissionsCard
                          key={item.id}
                          item={item}
                          permissions={permissions}
                          onEdit={(profile) => {
                            setProfileDialog({
                              mode: 'edit',
                              profile,
                            })
                          }}
                          onDelete={(profileId) => {
                            setDeleteOpen(profileId)
                          }}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      </div>

      {profileDialog && (
        <PermissionProfileDialog
          mode={profileDialog.mode}
          profile={profileDialog.mode === 'edit' ? profileDialog.profile : null}
          isPending={
            profileDialog.mode === 'edit'
              ? updatePermissionProfilePending
              : createPermissionProfilePending
          }
          onClose={closeProfileDialog}
          onSubmit={handleProfileSubmit}
        />
      )}
      <DeletePermissionProfileDialog
        open={deleteOpen !== null}
        isPending={deletePermissionProfilePending}
        onOpenChange={(open) => {
          if (!open) setDeleteOpen(null)
        }}
        onConfirm={() => {
          if (!deleteOpen) return

          deletePermissionProfile(deleteOpen, {
            onSuccess: () => {
              setDeleteOpen(null)
            },
          })
        }}
      />
    </div>
  )
}

type PermissionProfileDialogProps = {
  mode: 'create' | 'edit'
  profile?: T_PermissionProfile | null
  isPending: boolean
  onClose: () => void
  onSubmit: (draft: PermissionProfileDraft) => void
}

function PermissionProfileDialog({
  mode,
  profile,
  isPending,
  onClose,
  onSubmit,
}: PermissionProfileDialogProps) {
  const isEdit = mode === 'edit'

  const [draft, setDraft] = useState<PermissionProfileDraft>(() => {
    if (isEdit && profile) {
      return {
        name: profile.name,
        description: profile.description ?? '',
        permissions: [...profile.permissions],
      }
    }

    return createEmptyDraft()
  })

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent className="max-w-xl! overflow-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Permission Profile' : 'New Permission Profile'}
          </DialogTitle>

          <DialogDescription>
            {isEdit
              ? 'Edit the details of this permission profile.'
              : 'Define a reusable set of permissions for your workspace.'}
          </DialogDescription>
        </DialogHeader>

        <div className="no-scrollbar -mx-4 max-h-[70vh] space-y-4 overflow-y-auto px-4">
          <ProfileDetailsFields draft={draft} setDraft={setDraft} />

          <PermissionGroupsEditor
            permissions={draft.permissions}
            onChange={(permissions) => {
              setDraft((current) => ({
                ...current,
                permissions,
              }))
            }}
          />
        </div>

        <DialogFooter className="bg-transparent">
          <Button variant="ghost" disabled={isPending} onClick={onClose}>
            Cancel
          </Button>

          <Button
            disabled={isPending || !draft.name.trim()}
            onClick={() => onSubmit(draft)}
          >
            <LoadingSwap isLoading={isPending}>
              {isEdit ? 'Save changes' : 'Create'}
            </LoadingSwap>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type ProfileDetailsFieldsProps = {
  draft: PermissionProfileDraft
  setDraft: React.Dispatch<React.SetStateAction<PermissionProfileDraft>>
}

function ProfileDetailsFields({ draft, setDraft }: ProfileDetailsFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="profile-name">Profile name</Label>

        <Input
          id="profile-name"
          value={draft.name}
          onChange={(event) => {
            setDraft((current) => ({
              ...current,
              name: event.target.value,
            }))
          }}
          placeholder="Product analyst"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="profile-description">Description</Label>

        <Textarea
          id="profile-description"
          value={draft.description}
          onChange={(event) => {
            setDraft((current) => ({
              ...current,
              description: event.target.value,
            }))
          }}
          placeholder="What this profile can access"
          rows={3}
        />
      </div>
    </>
  )
}

type PermissionGroupsEditorProps = {
  permissions: Permission[]
  onChange: (permissions: Permission[]) => void
}

function PermissionGroupsEditor({
  permissions,
  onChange,
}: PermissionGroupsEditorProps) {
  const togglePermission = (permission: Permission, checked: boolean) => {
    const nextPermissions = new Set(permissions)

    if (checked) {
      nextPermissions.add(permission)
    } else {
      nextPermissions.delete(permission)
    }

    onChange([...nextPermissions])
  }

  const toggleGroup = (
    groupPermissions: readonly PermissionDefinition[],
    checked: boolean
  ) => {
    const nextPermissions = new Set(permissions)

    groupPermissions.forEach((permission) => {
      if (checked) {
        nextPermissions.add(permission.key)
      } else {
        nextPermissions.delete(permission.key)
      }
    })

    onChange([...nextPermissions])
  }

  return (
    <div className="space-y-4">
      {PERMISSION_GROUPS.map((group) => {
        const allSelected = group.permissions.every((permission) =>
          permissions.includes(permission.key)
        )

        return (
          <div key={group.id} className="border-2 border-dashed">
            <div className="flex flex-col gap-3 p-4 pb-0 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h4 className="font-medium">{group.label}</h4>

                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  {group.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-muted-foreground text-xs">
                  Select all
                </Label>

                <Switch
                  checked={allSelected}
                  onCheckedChange={(checked) => {
                    toggleGroup(group.permissions, checked)
                  }}
                  aria-label={`Select all ${group.label} permissions`}
                />
              </div>
            </div>

            <div className="p-4">
              <div className="divide-y-2 divide-dashed border-2 border-dashed">
                {group.permissions.map((permission) => {
                  const id = `permission-${permission.key.replaceAll('.', '-')}`

                  return (
                    <div
                      key={permission.key}
                      className="flex items-start justify-between gap-4 p-3"
                    >
                      <Label
                        className="flex cursor-pointer flex-col items-start"
                        htmlFor={id}
                      >
                        <span className="block text-sm font-medium">
                          {permission.label}
                        </span>

                        <span className="text-muted-foreground block text-xs leading-5">
                          {permission.description}
                        </span>
                      </Label>

                      <Switch
                        id={id}
                        checked={permissions.includes(permission.key)}
                        onCheckedChange={(checked) => {
                          togglePermission(permission.key, checked)
                        }}
                        aria-label={permission.label}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

type DeletePermissionProfileDialogProps = {
  open: boolean
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

function DeletePermissionProfileDialog({
  open,
  isPending,
  onOpenChange,
  onConfirm,
}: DeletePermissionProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Permission Profile</DialogTitle>

          <DialogDescription>
            Are you sure you want to delete this permission profile?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="py-2">
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>

          <Button
            variant="destructive"
            disabled={isPending}
            onClick={onConfirm}
          >
            <LoadingSwap isLoading={isPending}>Confirm</LoadingSwap>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PermissionTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <Skeleton className="h-6 w-50" />
          </TableCell>

          <TableCell>
            <div className="flex justify-center">
              <Skeleton className="h-6 w-20" />
            </div>
          </TableCell>

          <TableCell>
            <div className="flex justify-center">
              <Skeleton className="h-6 w-12" />
            </div>
          </TableCell>

          <TableCell>
            <div className="flex justify-center">
              <Skeleton className="h-8 w-8" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  )
}

type PermissionsCardProps = {
  item: T_PermissionProfile
  permissions: Permission[]
  onEdit: (profile: T_PermissionProfile) => void
  onDelete: (profileId: string) => void
}

function PermissionsCard({
  item,
  permissions,
  onEdit,
  onDelete,
}: PermissionsCardProps) {
  const navigate = useNavigate()

  const permissionMenuItems = [
    {
      label: 'Edit Permission',
      action: 'edit-permission',
      onClick: () => onEdit(item),
      disabled:
        !permissions.includes('workspace.permission_profiles.update') ||
        item.isSystem,
    },
    {
      label: 'Delete Permission',
      action: 'delete-permission',
      variant: 'destructive' as const,
      separatorBefore: true,
      disabled:
        !permissions.includes('workspace.permission_profiles.delete') ||
        item.isSystem,
      onClick: () => onDelete(item.id),
    },
  ]

  const openProfile = () => {
    navigate({
      to: '/app/$workspaceId/permissions/$permissionId',
      params: {
        permissionId: item.id,
        workspaceId: item.workspaceId,
      },
    })
  }

  return (
    <TableRow className="hover:bg-card/40 cursor-pointer" onClick={openProfile}>
      <TableCell>
        <div className="max-w-80 overflow-hidden">
          <div className="flex items-center gap-2 overflow-hidden">
            <p className="truncate text-sm font-medium">{item.name}</p>

            {item.isSystem && <Badge variant="outline">Built in</Badge>}
          </div>

          <p className="text-muted-foreground truncate text-xs">
            {item.description}
          </p>
        </div>
      </TableCell>

      <TableCell className="text-center">
        <span className="text-sm">{item.permissions.length}</span>
      </TableCell>

      <TableCell className="text-center">
        <span className="text-sm">{item.memberCount}</span>
      </TableCell>

      <TableCell className="text-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                onClick={(event) => {
                  event.stopPropagation()
                }}
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-fit" align="end">
            {permissionMenuItems.map((menuItem) => (
              <div key={menuItem.action}>
                {menuItem.separatorBefore && <DropdownMenuSeparator />}

                <DropdownMenuItem
                  disabled={menuItem.disabled}
                  variant={menuItem.variant}
                  onClick={(event) => {
                    event.stopPropagation()

                    if (menuItem.disabled) return

                    menuItem.onClick()
                  }}
                >
                  {menuItem.label}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
