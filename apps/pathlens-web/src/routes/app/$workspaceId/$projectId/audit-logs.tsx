import { getAuditLogsOptions } from '@/queries/audit-logs'
import {
  capitalizeFirstLetter,
  formatDate,
  getPaginationItems,
} from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
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
import { SearchIcon } from 'lucide-react'
import { useState } from 'react'
import { DotSeparator, DotSeparatorItem } from '../../-components/dot-separator'
import { UserDetailsSheet } from '../$projectId/-components/user/user-details-sheet'
import {
  getWorkspaceMembersOptions,
  getWorkspacePermissionsOptions,
} from '@/queries/workspace'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { NoPermissionView } from './-components/common/no-permission-view'
import { ErrorScreen } from './-components/common/error-screen'

export const Route = createFileRoute('/app/$workspaceId/$projectId/audit-logs')(
  {
    component: RouteComponent,
  }
)

const PAGE_SIZE = 10

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const [page, setPage] = useState(1)
  const [memberId, setMemberId] = useState('all')

  const {
    data: permissionsData,
    isLoading: permissionsLoading,
    error: permissionsError,
    refetch: permissionsRefetch,
    isRefetching: permissionsRefetching,
  } = useQuery(getWorkspacePermissionsOptions(workspaceId))

  const permissions = permissionsData?.data
  const hasViewPermission = permissions?.includes('project.audit_logs.view')

  const {
    data: auditLogsData,
    isLoading: auditLogsLoading,
    error: auditLogsError,
    isRefetching: auditLogsRefetching,
    refetch: auditLogsRefetch,
  } = useQuery({
    ...getAuditLogsOptions({
      workspace_id: workspaceId,
      page,
      page_size: PAGE_SIZE,
      project_id: projectId,
      actor_user_id: memberId === 'all' ? undefined : memberId,
    }),
    enabled: !!hasViewPermission,
  })

  const {
    data: membersData,
    isLoading: membersLoading,
    error: membersError,
    refetch: membersRefetch,
    isRefetching: membersRefetching,
  } = useQuery({
    ...getWorkspaceMembersOptions(workspaceId),
    enabled: !!hasViewPermission,
  })

  const auditLogs = auditLogsData?.data
  const members = membersData?.data
  const totalLogs = auditLogsData?.pagination?.total ?? 0
  const totalPages = auditLogsData?.pagination?.totalPages ?? 0
  const from = totalLogs === 0 ? 0 : (page - 1) * PAGE_SIZE + 1

  const paginationItems = getPaginationItems(page, totalPages)

  const to = Math.min(page * PAGE_SIZE, totalLogs)

  const memberItems = [
    {
      label: 'All Members',
      value: 'all',
    },
    ...(members?.map((item) => ({
      label: item.name,
      value: String(item.id),
    })) ?? []),
  ]

  const globalLoading = permissionsLoading || membersLoading || auditLogsLoading
  const globalError = permissionsError || membersError || auditLogsError
  const globalRefetching =
    permissionsRefetching || membersRefetching || auditLogsRefetching
  const refetch = () =>
    Promise.all([permissionsRefetch(), membersRefetch(), auditLogsRefetch()])

  return (
    <div className="p-6">
      <div className="space-y-4">
        <div>
          <p className="text-xl font-medium">Audit logs</p>
          <p className="text-muted-foreground text-sm">
            See the history of changes made within this workspace.
          </p>
        </div>

        {globalError && !globalLoading ? (
          <ErrorScreen
            workspace_id={workspaceId}
            project_id={projectId}
            refetch={refetch}
            refetching={globalRefetching}
          />
        ) : (
          <>
            {!hasViewPermission && !permissionsLoading ? (
              <NoPermissionView />
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <InputGroup className="w-120">
                    <InputGroupButton>
                      <SearchIcon />
                    </InputGroupButton>
                    <InputGroupInput placeholder="Search..." />
                  </InputGroup>

                  <div className="flex items-center justify-between gap-2">
                    <Select
                      items={memberItems}
                      value={memberId}
                      onValueChange={(value) => {
                        setMemberId(value ?? 'all')
                      }}
                    >
                      <SelectTrigger disabled={globalLoading}>
                        <SelectValue placeholder="All Members" />
                      </SelectTrigger>

                      <SelectContent alignItemWithTrigger={false}>
                        {memberItems?.map((item, index) => (
                          <SelectItem key={index} value={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="">
                  <div className="overflow-hidden border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action Time</TableHead>
                          <TableHead className="w-[40%]">Resource</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Actor</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {globalLoading
                          ? [...Array(PAGE_SIZE)].map((_, index) => (
                              <TableRow key={index}>
                                <TableCell>
                                  <Skeleton className="h-5 w-32" />
                                </TableCell>

                                <TableCell>
                                  <Skeleton className="h-5 w-60" />
                                </TableCell>

                                <TableCell>
                                  <Skeleton className="h-5 w-40" />
                                </TableCell>

                                <TableCell>
                                  <Skeleton className="h-5 w-40" />
                                </TableCell>
                              </TableRow>
                            ))
                          : auditLogs?.map((item) => (
                              <TableRow
                                key={item.id}
                                className="hover:bg-card/40 cursor-pointer"
                              >
                                <TableCell>
                                  {formatDate(item.createdAt)}
                                </TableCell>
                                <TableCell>
                                  <p>
                                    {capitalizeFirstLetter(
                                      item.resourceType.replaceAll('_', ' ')
                                    )}
                                  </p>

                                  {item.metadata && (
                                    <DotSeparator>
                                      <DotSeparatorItem>
                                        <p className="text-muted-foreground text-xs">
                                          {capitalizeFirstLetter(
                                            item.metadata?.name
                                          )}
                                        </p>
                                      </DotSeparatorItem>
                                    </DotSeparator>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {capitalizeFirstLetter(
                                    item.action
                                      .replaceAll('_', ' ')
                                      .replaceAll('.', ' ')
                                  )}
                                </TableCell>
                                <TableCell>
                                  <UserDetailsSheet
                                    userId={item.actor.id}
                                    workspaceId={workspaceId}
                                  />
                                </TableCell>
                              </TableRow>
                            ))}

                        {!globalLoading && !auditLogs?.length && (
                          <TableRow>
                            <TableCell colSpan={7} className="h-32 text-center">
                              <p className="text-muted-foreground text-sm">
                                No audit logs found.
                              </p>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between border-t px-4 py-3">
                      <p className="text-muted-foreground text-sm">
                        {totalLogs > 0 ? (
                          <>
                            Showing {from}-{to} of {totalLogs} audit logs
                          </>
                        ) : (
                          'No audit logs'
                        )}
                      </p>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={page <= 1 || globalLoading}
                          onClick={() => {
                            setPage((current) => Math.max(current - 1, 1))
                          }}
                        >
                          Previous
                        </Button>

                        <div className="flex items-center gap-1">
                          {paginationItems.map((item, index) => {
                            if (item === 'ellipsis') {
                              return (
                                <span
                                  key={`ellipsis-${index}`}
                                  className="text-muted-foreground flex size-8 items-center justify-center text-sm"
                                >
                                  ...
                                </span>
                              )
                            }

                            return (
                              <Button
                                key={item}
                                variant={page === item ? 'outline' : 'ghost'}
                                size="icon"
                                className="size-8"
                                disabled={globalLoading}
                                onClick={() => {
                                  setPage(item)
                                }}
                              >
                                {item}
                              </Button>
                            )
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          disabled={
                            !auditLogsData?.pagination?.hasNextPage ||
                            globalLoading
                          }
                          onClick={() => {
                            setPage((current) =>
                              Math.min(current + 1, totalPages)
                            )
                          }}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}{' '}
          </>
        )}
      </div>
    </div>
  )
}
