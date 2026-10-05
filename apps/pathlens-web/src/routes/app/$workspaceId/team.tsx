import {
  getWorkspaceMembersOptions,
  getWorkspacePermissionProfilesOptions,
} from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouteContext } from '@tanstack/react-router'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import {
  ArrowUpRightIcon,
  EllipsisIcon,
  SearchIcon,
  UserPlusIcon,
} from 'lucide-react'

export const Route = createFileRoute('/app/$workspaceId/team')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId } = Route.useParams()

  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })

  const {
    data: membersData,
    isPending: membersPending,
    // isError: membersError,
  } = useQuery(getWorkspaceMembersOptions(workspaceId))
  const {
    data: profilesData,
    // isPending: profilesPending
  } = useQuery(getWorkspacePermissionProfilesOptions(workspaceId))
  const profiles = profilesData?.data ?? []
  const getProfileLabel = (profileId: string | null, role: string) => {
    if (role === 'owner') return 'Owner'
    if (role === 'member') return 'Member'

    return (
      profiles.find((profile) => profile.id === profileId)?.name ??
      'Unassigned profile'
    )
  }

  return (
    <div>
      <DropdownMenu>
        <div className="mx-auto max-w-4xl pt-10">
          <div className="space-y-5">
            <p className="text-2xl font-medium">Team</p>

            <div>
              <div className="flex items-center justify-between gap-4">
                <InputGroup>
                  <InputGroupButton>
                    <SearchIcon />
                  </InputGroupButton>
                  <InputGroupInput placeholder="Search..." />
                </InputGroup>

                <Button
                  render={
                    <Link
                      params={{
                        workspaceId,
                      }}
                      to="/app/$workspaceId/invite"
                    />
                  }
                >
                  <UserPlusIcon />
                  Invite Member
                </Button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-40 text-center">Role</TableHead>
                    <TableHead className="w-40 text-center">
                      Access profile
                    </TableHead>
                    <TableHead className="w-20 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {membersPending
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
                              <Skeleton className="h-8 w-8" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    : membersData?.data?.map((item) => (
                        <TableRow
                          key={item.id ?? item.email}
                          className="hover:bg-card/40 cursor-pointer"
                        >
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
                            {getProfileLabel(
                              item.permissionProfileId,
                              item.role
                            )}
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
                            <DropdownMenuTrigger
                              render={<Button variant="ghost" size="icon" />}
                            >
                              <EllipsisIcon />
                            </DropdownMenuTrigger>
                          </TableCell>

                          <DropdownMenuContent align="end" className={'w-fit'}>
                            <DropdownMenuItem disabled={item.role === 'owner'}>
                              Edit Access
                            </DropdownMenuItem>
                            <DropdownMenuItem disabled={item.role === 'owner'}>
                              Edit Role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={item.role === 'owner'}
                              variant="destructive"
                            >
                              Remove Member
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </TableRow>
                      ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </DropdownMenu>
    </div>
  )
}
