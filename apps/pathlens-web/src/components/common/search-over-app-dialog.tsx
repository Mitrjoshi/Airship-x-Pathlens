import { getProjectsOptions } from '@/queries/projects'
import { getWorkspacesOptions, type T_Workspace } from '@/queries/workspace'
import { useQueries, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { Permission } from '@workspace/contracts'
import { Button } from '@workspace/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import { Input } from '@workspace/ui/components/input'
import { cn } from '@workspace/ui/lib/utils'
import { MailPlusIcon, SearchIcon, SparklesIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { navigationIcons } from '@/config/navigation-icons'
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'

type WorkspacePagePath =
  | '/app/$workspace'
  | '/app/$workspace/members'
  | '/app/$workspace/permission-profiles'
  | '/app/$workspace/workspace-settings'
  | '/app/$workspace/billing'
  | '/app/$workspace/invite'

type ProjectPagePath =
  | '/app/$workspace/projects/$project/dashboard'
  | '/app/$workspace/projects/$project/analytics'
  | '/app/$workspace/projects/$project/heatmaps'
  | '/app/$workspace/projects/$project/visitors'
  | '/app/$workspace/projects/$project/performance'
  | '/app/$workspace/projects/$project/user-journey'
  | '/app/$workspace/projects/$project/session-replay'
  | '/app/$workspace/projects/$project/events'
  | '/app/$workspace/projects/$project/errors'
  | '/app/$workspace/projects/$project/campaigns'
  | '/app/$workspace/projects/$project/funnels'
  | '/app/$workspace/projects/$project/goals'
  | '/app/$workspace/projects/$project/ai-insights'
  | '/app/$workspace/projects/$project/reports'
  | '/app/$workspace/projects/$project/keys'
  | '/app/$workspace/projects/$project/settings'

type AppPagePath = '/app/account' | '/app/plans'

interface PageDefinition<TPath extends string> {
  id: string
  title: string
  description: string
  keywords: string
  icon: LucideIcon
  to: TPath
  permissions?: readonly Permission[]
}

type SearchCategory = 'Pages' | 'Workspaces' | 'Projects'

interface SearchResult {
  id: string
  title: string
  description: string
  keywords: string
  category: SearchCategory
  icon: LucideIcon
  onSelect: () => void
}

const appPageDefinitions: PageDefinition<AppPagePath>[] = [
  {
    id: 'account',
    title: 'Account',
    description: 'Manage your profile and account preferences',
    keywords: 'profile preferences security password',
    icon: navigationIcons.settings,
    to: '/app/account',
  },
  {
    id: 'plans',
    title: 'Plans',
    description: 'Review plans, usage, and upgrade options',
    keywords: 'billing subscription upgrade usage',
    icon: SparklesIcon,
    to: '/app/plans',
  },
]

const workspacePageDefinitions: PageDefinition<WorkspacePagePath>[] = [
  {
    id: 'workspace-projects',
    title: 'Projects',
    description: 'Browse projects in this workspace',
    keywords: 'workspace sites properties',
    icon: navigationIcons.projects,
    to: '/app/$workspace',
  },
  {
    id: 'workspace-members',
    title: 'Members',
    description: 'Manage workspace members and invitations',
    keywords: 'team users people invite',
    icon: navigationIcons.members,
    to: '/app/$workspace/members',
    permissions: ['workspace.members.view'],
  },
  {
    id: 'workspace-invite',
    title: 'Invite members',
    description: 'Invite someone to this workspace',
    keywords: 'team users people email invitation',
    icon: MailPlusIcon,
    to: '/app/$workspace/invite',
    permissions: ['workspace.members.invite'],
  },
  {
    id: 'workspace-permissions',
    title: 'Permission profiles',
    description: 'Manage workspace roles and permissions',
    keywords: 'access roles security profiles',
    icon: navigationIcons.permissions,
    to: '/app/$workspace/permission-profiles',
    permissions: [
      'workspace.permission_profiles.view',
      'workspace.permission_profiles.create',
      'workspace.permission_profiles.update',
      'workspace.permission_profiles.delete',
    ],
  },
  {
    id: 'workspace-settings',
    title: 'Workspace settings',
    description: 'Manage workspace details and configuration',
    keywords: 'workspace configuration general settings',
    icon: navigationIcons.workspaceSettings,
    to: '/app/$workspace/workspace-settings',
    permissions: ['workspace.settings.view'],
  },
  {
    id: 'workspace-billing',
    title: 'Billing',
    description: 'Manage workspace billing and invoices',
    keywords: 'plan payment invoices subscription',
    icon: navigationIcons.billing,
    to: '/app/$workspace/billing',
  },
]

const projectPageDefinitions: PageDefinition<ProjectPagePath>[] = [
  {
    id: 'project-dashboard',
    title: 'Dashboard',
    description: 'See the most important project signals',
    keywords: 'overview metrics traffic visitors',
    icon: navigationIcons.dashboard,
    to: '/app/$workspace/projects/$project/dashboard',
    permissions: ['analytics.dashboard.view'],
  },
  {
    id: 'project-analytics',
    title: 'Analytics',
    description: 'Explore project traffic and trends',
    keywords: 'charts traffic trends visitors sessions',
    icon: navigationIcons.analytics,
    to: '/app/$workspace/projects/$project/analytics',
    permissions: ['analytics.analytics.view'],
  },
  {
    id: 'project-visitors',
    title: 'Visitors',
    description: 'Inspect visitors and their activity',
    keywords: 'users people audience live visitors',
    icon: navigationIcons.visitors,
    to: '/app/$workspace/projects/$project/visitors',
    permissions: ['analytics.visitors.view'],
  },
  {
    id: 'project-heatmaps',
    title: 'Heatmaps',
    description: 'See where visitors click and how far they scroll',
    keywords: 'clicks scroll behavior page maps attention',
    icon: navigationIcons.heatmaps,
    to: '/app/$workspace/projects/$project/heatmaps',
    permissions: ['analytics.analytics.view'],
  },
  {
    id: 'project-performance',
    title: 'Performance',
    description: 'Review page and loading performance',
    keywords: 'speed timing web vitals load',
    icon: navigationIcons.performance,
    to: '/app/$workspace/projects/$project/performance',
    permissions: ['analytics.performance.view'],
  },
  {
    id: 'project-user-journey',
    title: 'User Journey',
    description: 'Explore the paths visitors take through your site',
    keywords: 'path analysis journey flow paths navigation behavior',
    icon: navigationIcons.userJourney,
    to: '/app/$workspace/projects/$project/user-journey',
    permissions: ['analytics.analytics.view'],
  },
  {
    id: 'project-session-replay',
    title: 'Session Replay',
    description: 'Watch recordings of visitor sessions',
    keywords: 'recordings behavior playback sessions',
    icon: navigationIcons.sessionReplay,
    to: '/app/$workspace/projects/$project/session-replay',
    permissions: ['analytics.session_replay.view'],
  },
  {
    id: 'project-events',
    title: 'Events',
    description: 'Monitor important visitor actions',
    keywords: 'activity clicks forms actions events',
    icon: navigationIcons.events,
    to: '/app/$workspace/projects/$project/events',
    permissions: ['analytics.events.view'],
  },
  {
    id: 'project-errors',
    title: 'Errors',
    description: 'Monitor JavaScript errors and rejected promises',
    keywords: 'errors exceptions bugs stack traces crashes monitoring',
    icon: navigationIcons.errors,
    to: '/app/$workspace/projects/$project/errors',
    permissions: ['analytics.analytics.view'],
  },
  {
    id: 'project-campaigns',
    title: 'Campaigns',
    description: 'Track UTM campaigns from visitors to revenue',
    keywords:
      'utm source medium campaign attribution visitors conversion revenue',
    icon: navigationIcons.campaigns,
    to: '/app/$workspace/projects/$project/campaigns',
    permissions: ['analytics.goals.view'],
  },
  {
    id: 'project-funnels',
    title: 'Funnels',
    description: 'Analyze conversion journeys',
    keywords: 'conversion journeys steps funnels',
    icon: navigationIcons.funnels,
    to: '/app/$workspace/projects/$project/funnels',
    permissions: ['analytics.funnels.view'],
  },
  {
    id: 'project-goals',
    title: 'Goals',
    description: 'Track important conversion goals',
    keywords: 'conversion targets goals',
    icon: navigationIcons.goals,
    to: '/app/$workspace/projects/$project/goals',
    permissions: ['analytics.goals.view'],
  },
  {
    id: 'project-ai-insights',
    title: 'AI Insights',
    description: 'Review generated observations and opportunities',
    keywords: 'artificial intelligence recommendations insights',
    icon: navigationIcons.aiInsights,
    to: '/app/$workspace/projects/$project/ai-insights',
    permissions: ['analytics.ai_insights.view'],
  },
  {
    id: 'project-reports',
    title: 'Reports',
    description: 'Review generated project reports',
    keywords: 'analytics exports reporting reports',
    icon: navigationIcons.reports,
    to: '/app/$workspace/projects/$project/reports',
    permissions: ['analytics.reports.view'],
  },
  {
    id: 'project-api-keys',
    title: 'API Keys',
    description: 'Manage project tracking keys',
    keywords: 'tracker integration credentials keys',
    icon: navigationIcons.apiKeys,
    to: '/app/$workspace/projects/$project/keys',
    permissions: ['project.api_keys.view'],
  },
  {
    id: 'project-settings',
    title: 'Project settings',
    description: 'Manage project details and configuration',
    keywords: 'project configuration domain settings',
    icon: navigationIcons.settings,
    to: '/app/$workspace/projects/$project/settings',
    permissions: ['project.settings.view'],
  },
]

function hasPermission(
  workspace: T_Workspace | undefined,
  permissions?: readonly Permission[]
): boolean {
  if (!permissions?.length) return true

  return (
    workspace?.role === 'owner' ||
    permissions.some((permission) =>
      workspace?.permissions.includes(permission)
    )
  )
}

function matchesSearch(result: SearchResult, query: string): boolean {
  if (!query) return true

  return `${result.title} ${result.description} ${result.keywords}`
    .toLowerCase()
    .includes(query)
}

export const SearchOverAppDialog = ({
  workspaceId,
  projectId,
}: {
  workspaceId: string
  projectId: string
}) => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([])
  const deferredSearch = useDeferredValue(search)

  const workspacesQuery = useQuery({
    ...getWorkspacesOptions(),
    enabled: open,
  })
  const workspaces = workspacesQuery.data?.data ?? []
  const projectQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      ...getProjectsOptions({ workspace_id: workspace.id }),
      enabled: open,
    })),
  })
  const projects = projectQueries.flatMap((query) => query.data?.data ?? [])
  const activeWorkspace = workspaces.find(
    (workspace) => workspace.id === workspaceId
  )

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', handleShortcut)

    return () => document.removeEventListener('keydown', handleShortcut)
  }, [])

  useEffect(() => {
    if (!open) return

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [open])

  const closeDialog = () => {
    setOpen(false)
    setSearch('')
    setActiveIndex(0)
  }

  const navigateToAppPage = (page: PageDefinition<AppPagePath>) => {
    closeDialog()
    navigate({ to: page.to })
  }

  const navigateToWorkspacePage = (page: PageDefinition<WorkspacePagePath>) => {
    closeDialog()
    navigate({
      to: page.to,
      params: { workspace: workspaceId },
    })
  }

  const navigateToProjectPage = (page: PageDefinition<ProjectPagePath>) => {
    closeDialog()
    navigate({
      to: page.to,
      params: { workspace: workspaceId, project: projectId },
    })
  }

  const pageResults: SearchResult[] = [
    ...appPageDefinitions.map((page) => ({
      ...page,
      category: 'Pages' as const,
      onSelect: () => navigateToAppPage(page),
    })),
    ...workspacePageDefinitions
      .filter((page) => hasPermission(activeWorkspace, page.permissions))
      .map((page) => ({
        ...page,
        category: 'Pages' as const,
        onSelect: () => navigateToWorkspacePage(page),
      })),
    ...projectPageDefinitions
      .filter((page) => hasPermission(activeWorkspace, page.permissions))
      .map((page) => ({
        ...page,
        category: 'Pages' as const,
        onSelect: () => navigateToProjectPage(page),
      })),
  ]

  const workspaceResults: SearchResult[] = workspaces.map((workspace) => ({
    id: `workspace-${workspace.id}`,
    title: workspace.name,
    description: `${workspace.projectCount} ${workspace.projectCount === 1 ? 'project' : 'projects'}`,
    keywords: `${workspace.name} workspace ${workspace.role ?? ''}`,
    category: 'Workspaces',
    icon: navigationIcons.projects,
    onSelect: () => {
      closeDialog()
      navigate({
        to: '/app/$workspace',
        params: { workspace: workspace.id },
      })
    },
  }))

  const projectResults: SearchResult[] = projects.flatMap((project) => {
    const workspace = workspaces.find((item) => item.id === project.workspaceId)

    if (!workspace) return []

    return [
      {
        id: `project-${project.id}`,
        title: project.name,
        description: `${workspace.name}${project.domain ? ` · ${project.domain}` : ''}`,
        keywords: `${project.name} ${project.description ?? ''} ${project.domain ?? ''}`,
        category: 'Projects' as const,
        icon: navigationIcons.projects,
        onSelect: () => {
          closeDialog()
          navigate({
            to: '/app/$workspace/projects/$project/dashboard',
            params: { workspace: project.workspaceId, project: project.id },
          })
        },
      },
    ]
  })

  const normalizedSearch = deferredSearch.trim().toLowerCase()
  const filteredResults = [
    ...pageResults,
    ...workspaceResults,
    ...projectResults,
  ].filter((result) => matchesSearch(result, normalizedSearch))
  const resultSections = (['Pages', 'Workspaces', 'Projects'] as const)
    .map((category) => ({
      category,
      results: filteredResults
        .map((result, index) => ({ result, index }))
        .filter(({ result }) => result.category === category),
    }))
    .filter((section) => section.results.length > 0)
  const activeResult = filteredResults[activeIndex]
  const isEntityLoading =
    open &&
    (workspacesQuery.isPending ||
      projectQueries.some((query) => query.isPending))

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!filteredResults.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => (index + 1) % filteredResults.length)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex(
        (index) => (index - 1 + filteredResults.length) % filteredResults.length
      )
    }

    if (event.key === 'Enter' && activeResult) {
      event.preventDefault()
      activeResult.onSelect()
    }
  }

  useEffect(() => {
    resultRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}
    >
      <DialogTrigger
        render={
          <Button
            className="text-muted-foreground gap-4"
            variant="outline"
            aria-label="Search across PathLens"
          >
            <span className="flex items-center gap-2">
              <SearchIcon />
              <span>Search...</span>
            </span>
            <kbd className="text-xs font-normal">Ctrl+K</kbd>
          </Button>
        }
      />
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[calc(100vh-12rem)] max-w-xl! flex-col gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Search PathLens</DialogTitle>
          <DialogDescription>
            Search pages, workspaces, and projects.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b p-3">
          <div className="relative">
            <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              ref={inputRef}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setActiveIndex(0)
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Search pages, workspaces, and projects..."
              aria-label="Search pages, workspaces, and projects"
              aria-controls="search-over-app-results"
              aria-activedescendant={
                activeResult ? `search-result-${activeIndex}` : undefined
              }
              aria-autocomplete="list"
              role="combobox"
              className="h-10 border-0 bg-transparent pl-9 shadow-none focus-visible:border-transparent focus-visible:ring-0"
            />
          </div>
        </div>

        <div
          id="search-over-app-results"
          role="listbox"
          aria-label="Search results"
          className="min-h-0 flex-1 space-y-4 overflow-y-auto p-2"
        >
          {resultSections.map((section) => (
            <section key={section.category} className="space-y-1">
              <p className="text-muted-foreground px-2 py-1 text-xs font-medium">
                {section.category}
              </p>
              {section.results.map(({ result, index }) => {
                const Icon = result.icon

                return (
                  <button
                    key={result.id}
                    id={`search-result-${index}`}
                    ref={(element) => {
                      resultRefs.current[index] = element
                    }}
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={cn(
                      'hover:bg-muted flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      index === activeIndex && 'bg-muted'
                    )}
                    onClick={result.onSelect}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {result.title}
                      </span>
                      <span className="text-muted-foreground block truncate text-xs">
                        {result.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </section>
          ))}

          {!filteredResults.length && (
            <div className="text-muted-foreground flex flex-col items-center justify-center px-5 py-12 text-center">
              <SearchIcon className="mb-3 size-5" />
              <p className="text-sm font-medium">No results found</p>
              <p className="mt-1 text-xs">Try a different search term.</p>
            </div>
          )}

          {isEntityLoading && (
            <p className="text-muted-foreground px-3 py-2 text-xs">
              Loading workspaces and projects...
            </p>
          )}
        </div>

        <div className="text-muted-foreground flex items-center justify-between border-t px-3 py-2 text-xs">
          <span>Use arrow keys to navigate</span>
          <span>Enter to open · Esc to close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
