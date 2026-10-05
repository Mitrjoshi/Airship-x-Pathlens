import { createFileRoute } from '@tanstack/react-router'
import { getWorkspaceByIdOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { NoPermissionView } from './-components/common/no-permission-view'
import { getProjectsOptions } from '@/queries/projects'
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
import { formatRelativeTime } from '@/utils/utils'
import { Skeleton } from '@workspace/ui/components/skeleton'

export const Route = createFileRoute('/app/$workspaceId/$projectId/api-keys')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()
  const { data, isLoading } = useQuery(getWorkspaceByIdOptions(workspaceId))
  const { data: keysData, isLoading: keysLoading } = useQuery(
    getProjectsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
    })
  )

  if (isLoading || keysLoading) {
    return <VisitorsLoading />
  }

  if (!data?.data.permissions.includes('project.api_keys.view')) {
    return <NoPermissionView />
  }

  return (
    <div className="space-y-6 p-6">
      {/* Heading */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xl font-medium">API Keys</p>

          <p className="text-muted-foreground text-sm">
            View and monitor all events captured across your project.
          </p>
        </div>

        <Button>Create New API Key</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead className="w-24 text-center">Category</TableHead>
            <TableHead className="w-32 text-center">Country</TableHead>
            <TableHead className="w-32 text-center">Visitor</TableHead>
            <TableHead className="w-32 text-center">Device</TableHead>
            <TableHead className="w-32 text-center">Occurred</TableHead>
            <TableHead className="w-20 text-center">Replay</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {keysLoading
            ? [...Array(5)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="space-y-1.5">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </TableCell>

                  <TableCell className="w-24">
                    <div className="flex justify-center">
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </TableCell>

                  <TableCell className="w-32">
                    <div className="flex justify-center">
                      <Skeleton className="h-5 w-14" />
                    </div>
                  </TableCell>

                  <TableCell className="w-32">
                    <div className="flex justify-center">
                      <Skeleton className="h-5 w-24" />
                    </div>
                  </TableCell>

                  <TableCell className="w-32">
                    <div className="flex justify-center">
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </TableCell>

                  <TableCell className="w-32">
                    <div className="flex justify-center">
                      <Skeleton className="h-5 w-20" />
                    </div>
                  </TableCell>

                  <TableCell className="w-20">
                    <div className="flex justify-center">
                      <Skeleton className="h-8 w-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            : keysData?.data?.map((item) => (
                <TableRow
                  onClick={() => {}}
                  key={item.id}
                  className="hover:bg-card/40 cursor-pointer"
                >
                  <TableCell className="w-24 text-center"></TableCell>
                </TableRow>
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
  )
}
