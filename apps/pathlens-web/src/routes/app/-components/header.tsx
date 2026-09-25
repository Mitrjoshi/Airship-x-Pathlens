import { FeedbackPopover } from '@/components/common/feedback-popover'
import { NavUser } from '@/components/common/nav-user'
import { NotificationsPopover } from '@/components/common/notifications-popover'
import { Link, useParams, useRouteContext } from '@tanstack/react-router'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@workspace/ui/components/dropdown-menu'
import { Button } from '@workspace/ui/components/button'
import { AnimatePresence, motion } from 'motion/react'
import {
  CheckIcon,
  ChevronsUpDownIcon,
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

export const Header = () => {
  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })

  const { workspaceId, projectId } = useParams({
    strict: false,
  })

  const {
    data: projects,
    isPending: projectsLoading,
    isError: projectsError,
  } = useQuery(
    getProjectsOptions({
      workspace_id: workspaceId,
    })
  )

  return (
    <header className="bg-background sticky top-0 z-10 flex h-14.25 shrink-0 items-center justify-between gap-2 border-b px-4 py-2 transition-[width,height] ease-linear">
      <div>
        {projectId && (
          <ProjectSwitcher
            activeProject={projectId}
            projectData={projects?.data as T_Projects[]}
            projectDataLoading={projectsLoading}
          />
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <FeedbackPopover />

        <NotificationsPopover />

        <Separator orientation="vertical" />

        <NavUser user={user} />
      </div>
    </header>
  )
}

interface I_ProjectSwitcherProps {
  projectData: T_Projects[]
  projectDataLoading: boolean
  activeProject: string
}

export const ProjectSwitcher = ({
  projectData,
  projectDataLoading,
  activeProject,
}: I_ProjectSwitcherProps) => {
  const project = projectData?.find((p) => p.id === activeProject)

  return (
    <>
      <DropdownMenu>
        <div className="flex w-full items-center justify-center gap-2 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={projectDataLoading ? 'loading' : project?.name}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="truncate text-[15px]"
            >
              {projectDataLoading ? 'Loading...' : project?.name}
            </motion.p>
          </AnimatePresence>
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
        </div>

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
                        }}
                      />
                    }
                  />
                }
              >
                <p>{item.name}</p>
                {activeProject === item.id && <CheckIcon />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            render={
              <Button variant="ghost" className={'w-full justify-start'} />
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
