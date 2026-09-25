import { getWorkspacesOptions } from '@/queries/workspace'
import { formatDate } from '@/utils/utils'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
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
import { navigationIcons } from '@/config/navigation-icons'

export const Route = createFileRoute('/app/(entry)/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { data: workspaceData, isLoading: workspaceDataLoading } = useQuery(
    getWorkspacesOptions()
  )

  return (
    <div>
      <div className="mx-auto max-w-4xl pt-10">
        <div className="space-y-5">
          <p className="text-2xl font-medium">Your Workspaces</p>

          <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <InputGroup>
                <InputGroupButton>
                  <SearchIcon />
                </InputGroupButton>
                <InputGroupInput placeholder="Search..." />
              </InputGroup>

              <Button>
                <PlusIcon />
                New Workspace
              </Button>
            </div>

            <div className="divide-y overflow-hidden rounded-lg border">
              <div className="flex items-center justify-between px-4 py-3">
                <p className="text-muted-foreground text-sm">Name</p>
                <div className="flex items-center gap-8">
                  <p className="text-muted-foreground w-12 text-center text-sm">
                    Projects
                  </p>
                  <p className="text-muted-foreground w-12 text-center text-sm">
                    Members
                  </p>
                  <p className="text-muted-foreground w-20 text-center text-sm">
                    Created at
                  </p>
                  <p className="text-muted-foreground w-12 text-center text-sm">
                    Action
                  </p>
                </div>
              </div>

              {workspaceDataLoading ? (
                <>
                  {[...Array(5)].map((_, index) => (
                    <div
                      className="hover:bg-card/40 flex cursor-pointer items-center justify-between px-4 py-3"
                      key={index}
                    >
                      <Skeleton className="h-6 w-50" />
                      <div className="flex items-center gap-8">
                        <Skeleton className="h-6 w-12" />
                        <Skeleton className="h-6 w-12" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-12" />
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                workspaceData?.data?.map((item, index) => (
                  <Link
                    to={`/app/$workspaceId`}
                    params={{
                      workspaceId: item.id,
                    }}
                    className="hover:bg-card/40 flex cursor-pointer items-center justify-between px-4 py-3"
                    key={index}
                  >
                    <p className="text-sm underline">{item.name}</p>
                    <div className="flex items-center gap-8">
                      <p className="w-12 text-center text-sm">
                        {item.projectCount}
                      </p>
                      <p className="w-12 text-center text-sm">
                        {item.memberCount}
                      </p>
                      <p className="w-20 text-center text-sm text-nowrap">
                        {formatDate(item.createdAt)}
                      </p>
                      <div className="flex w-12 items-center justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                onClick={(e) => e.preventDefault()}
                                variant={'ghost'}
                                size="icon"
                              />
                            }
                          >
                            <EllipsisIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              render={
                                <Button
                                  className={'w-full justify-start'}
                                  variant={'ghost'}
                                />
                              }
                            >
                              <navigationIcons.projects />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              render={
                                <Button
                                  className={'w-full justify-start'}
                                  variant={'ghost'}
                                />
                              }
                            >
                              <navigationIcons.settings />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              render={
                                <Button
                                  className={'w-full justify-start'}
                                  variant={'ghost'}
                                />
                              }
                              variant="destructive"
                            >
                              <navigationIcons.trash />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
