import {
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
import React, { useState } from 'react'
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
  PERMISSION_GROUPS,
  type Permission,
  type PermissionDefinition,
} from '@workspace/contracts'
import { Switch } from '@workspace/ui/components/switch'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { Label } from '@workspace/ui/components/label'
import { Separator } from '@workspace/ui/components/separator'

export const Route = createFileRoute('/app/$workspaceId/permissions/')({
  component: RouteComponent,
})

const emptyDraft: PermissionProfileDraft = {
  name: '',
  description: '',
  permissions: [],
}

type PermissionProfileDraft = {
  name: string
  description: string
  permissions: Permission[]
}

function RouteComponent() {
  const { workspaceId } = Route.useParams()
  const [open, setOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState<string | null>(null)
  const [draft, setDraft] = useState<PermissionProfileDraft>(emptyDraft)

  const {
    data: profilesData,
    isPending: profilesPending,
    isError: profilesError,
  } = useQuery(getWorkspacePermissionProfilesOptions(workspaceId))

  const togglePermission = (permission: Permission, checked: boolean) => {
    setDraft((current) => {
      const permissions = new Set(current.permissions)

      if (checked) permissions.add(permission)
      else permissions.delete(permission)

      return {
        ...current,
        permissions: [...permissions],
      }
    })
  }

  const toggleGroup = (
    groupPermissions: readonly PermissionDefinition[],
    checked: boolean
  ) => {
    setDraft((current) => {
      const permissions = new Set(current.permissions)

      for (const permission of groupPermissions) {
        if (checked) permissions.add(permission.key)
        else permissions.delete(permission.key)
      }

      return {
        ...current,
        permissions: [...permissions],
      }
    })
  }

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <div className="mx-auto max-w-4xl pt-10">
          <div className="space-y-5">
            <p className="text-2xl font-medium">Permission Profiles</p>

            {profilesError ? (
              <>
                <div className="flex items-center gap-1">
                  <InfoIcon size={18} className="text-destructive" />
                  <p className="text-destructive">Failed to load profiles</p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="flex items-center justify-between gap-4">
                    <InputGroup>
                      <InputGroupButton>
                        <SearchIcon />
                      </InputGroupButton>
                      <InputGroupInput placeholder="Search..." />
                    </InputGroup>

                    <DialogTrigger render={<Button />}>
                      <PlusIcon />
                      New Permission
                    </DialogTrigger>
                  </div>
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
                        <TableHead className="w-20 text-center">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {profilesPending
                        ? [...Array(5)].map((_, index) => (
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
                          ))
                        : profilesData?.data?.map((item) => (
                            <PermissionsCard
                              setDeleteOpen={setDeleteOpen}
                              item={item}
                            />
                          ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogContent className={'max-w-xl! overflow-auto'}>
          <DialogHeader>
            <DialogTitle>New Permission Profile</DialogTitle>
            <DialogDescription>
              Define a reusable set of permissions for your workspace.
            </DialogDescription>
          </DialogHeader>

          <div className="no-scrollbar -mx-4 max-h-[70vh] space-y-4 overflow-y-auto px-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Profile name</Label>
              <Input
                id="profile-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Product analyst"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-description">Description</Label>
              <Textarea
                id="profile-description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="What this profile can access"
                rows={3}
              />
            </div>

            <div className="space-y-4">
              {PERMISSION_GROUPS.map((group) => {
                const allSelected = group.permissions.every((permission) =>
                  draft.permissions.includes(permission.key)
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
                          onCheckedChange={(checked) =>
                            toggleGroup(group.permissions, checked)
                          }
                          aria-label={`Select all ${group.label} permissions`}
                        />
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="divide-y-2 divide-dashed border-2 border-dashed">
                        {group.permissions.map((permission, index) => (
                          <div className="flex items-start justify-between gap-4 p-3">
                            <Label
                              key={index}
                              className="flex cursor-pointer flex-col items-start"
                              htmlFor={`permission-${permission.key.replaceAll('.', '-')}`}
                            >
                              <span className="block text-sm font-medium">
                                {permission.label}
                              </span>
                              <span className="text-muted-foreground block text-xs leading-5">
                                {permission.description}
                              </span>
                            </Label>
                            <Switch
                              id={`permission-${permission.key.replaceAll('.', '-')}`}
                              checked={draft.permissions.includes(
                                permission.key
                              )}
                              onCheckedChange={(checked) =>
                                togglePermission(permission.key, checked)
                              }
                              aria-label={permission.label}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <DialogFooter className="bg-transparent">
            <DialogClose render={<Button variant="ghost">Cancel</Button>}>
              Close
            </DialogClose>
            <Button type="submit">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const PermissionsCard = ({
  item,
  setDeleteOpen,
}: {
  item: T_PermissionProfile
  setDeleteOpen: React.Dispatch<React.SetStateAction<string | null>>
}) => {
  const navigate = useNavigate()
  const permissionMenuItems = [
    {
      label: 'Edit Permission',
      action: 'edit-permission',
      onClick: () => {},
      display: true,
    },
    {
      label: 'Delete Permission',
      action: 'delete-permission',
      variant: 'destructive' as const,
      separatorBefore: true,
      display: item.permissions.includes(
        'workspace.permission_profiles.delete'
      ),
      onClick: () => {
        setDeleteOpen(item.id)
      },
    },
  ]

  return (
    <TableRow
      key={item.id ?? item.name}
      className="hover:bg-card/40 cursor-pointer"
      onClick={() => {
        navigate({
          to: '/app/$workspaceId/permissions/$permissionId',
          params: {
            permissionId: item.id,
          },
        })
      }}
    >
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
                onClick={(e) => {
                  e.stopPropagation()
                }}
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>

          <DropdownMenuContent className={'w-fit'} align="end">
            {permissionMenuItems.map(
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
