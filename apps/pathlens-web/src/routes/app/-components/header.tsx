import { FeedbackPopover } from '@/components/common/feedback-popover'
import { NavUser } from '@/components/common/nav-user'
import { NotificationsPopover } from '@/components/common/notifications-popover'
import {
  Link,
  useNavigate,
  useParams,
  useRouteContext,
} from '@tanstack/react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Button } from '@workspace/ui/components/button'
import {
  CheckIcon,
  ChevronsUpDownIcon,
  CircleQuestionMarkIcon,
  PlusIcon,
  SearchIcon,
} from 'lucide-react'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { getProjectsOptions, type T_Projects } from '@/queries/projects'
import { Separator } from '@workspace/ui/components/separator'
import { useQuery } from '@tanstack/react-query'
import { Avatar, AvatarImage } from '@workspace/ui/components/avatar'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Sheet, SheetTrigger } from '@workspace/ui/components/sheet'
import { ContactUsSheet } from '../$workspaceId/$projectId/-components/common/error-screen'

export const Header = () => {
  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })

  const { workspaceId, projectId } = useParams({
    strict: false,
  })

  const { data: projects, isPending: projectsLoading } = useQuery({
    ...getProjectsOptions({
      workspace_id: workspaceId!,
    }),
    enabled: !!projectId,
  })

  return (
    <header className="bg-background sticky top-0 z-10 flex h-14.25 shrink-0 items-center justify-between gap-2 border-b px-4 py-2 transition-[width,height] ease-linear">
      <div className="flex items-center gap-2">
        {projectId && (
          <ProjectSwitcher
            activeProject={projectId}
            projectData={projects?.data as T_Projects[]}
            projectDataLoading={projectsLoading}
            workspaceId={workspaceId!}
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <FeedbackPopover />

        <Sheet>
          <SheetTrigger
            render={
              <Button variant={'outline'} size="icon">
                <CircleQuestionMarkIcon />
              </Button>
            }
          />

          <ContactUsSheet workspace_id={workspaceId} project_id={projectId!} />
        </Sheet>

        <Separator orientation="vertical" />

        <NotificationsPopover />

        <NavUser user={user} />
      </div>
    </header>
  )
}

interface I_ProjectSwitcherProps {
  projectData: T_Projects[]
  projectDataLoading: boolean
  activeProject: string
  workspaceId: string
}

export const ProjectSwitcher = ({
  projectData,
  projectDataLoading,
  activeProject,
  workspaceId,
}: I_ProjectSwitcherProps) => {
  const navigate = useNavigate()
  const project = projectData?.find((p) => p.id === activeProject)

  return (
    <>
      <DropdownMenu>
        <Button
          onClick={() => {
            navigate({
              to: '/app/$workspaceId/$projectId',
              params: {
                workspaceId,
                projectId: activeProject,
              },
            })
          }}
          variant="link"
          className={'text-foreground'}
        >
          {projectDataLoading ? (
            <Skeleton className="h-4 w-30" />
          ) : (
            project?.name
          )}
        </Button>
        <DropdownMenuTrigger
          disabled={projectDataLoading}
          render={
            <Button
              size="icon"
              variant={'ghost'}
              className={'flex-1 overflow-hidden'}
            />
          }
        >
          <ChevronsUpDownIcon />
        </DropdownMenuTrigger>

        <DropdownMenuContent className={'w-80'}>
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search..." />
          </InputGroup>

          <DropdownMenuSeparator />

          <DropdownMenuGroup className={'h-60! overflow-auto'}>
            {projectData?.map((item, index) => (
              <DropdownMenuItem
                key={index}
                render={
                  <Button
                    size="lg"
                    variant={activeProject === item.id ? 'secondary' : 'ghost'}
                    className={'w-full justify-between'}
                    render={
                      <Link
                        to={'/app/$workspaceId/$projectId'}
                        params={{
                          projectId: item.id,
                          workspaceId: workspaceId,
                        }}
                      />
                    }
                  />
                }
              >
                <div className="flex items-center gap-2">
                  <Avatar size="sm" className={'border bg-white'}>
                    <AvatarImage
                      src={item.faviconUrl ? item.faviconUrl : '/logo.png'}
                    />
                  </Avatar>
                  <p>{item.name}</p>
                </div>
                {activeProject === item.id && <CheckIcon />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            render={
              <Button
                render={
                  <Link
                    to={'/app/$workspaceId/create'}
                    params={{
                      workspaceId,
                    }}
                  />
                }
                variant="ghost"
                className={'w-full justify-start'}
              />
            }
          >
            <PlusIcon />
            Create Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
