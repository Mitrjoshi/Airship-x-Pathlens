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
import { SearchIcon } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'

import { navigationIcons } from '@/config/navigation-icons'

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AppPagePath = '/app/account'

type WorkspacePagePath =
  | '/app/$workspaceId'
  | '/app/$workspaceId/team'
  | '/app/$workspaceId/permissions'
  | '/app/$workspaceId/usage'
  | '/app/$workspaceId/audit-logs'
  | '/app/$workspaceId/settings'

type ProjectPagePath =
  | '/app/$workspaceId/$projectId'
  | '/app/$workspaceId/$projectId/user-journey'
  | '/app/$workspaceId/$projectId/goals'
  | '/app/$workspaceId/$projectId/events'
  | '/app/$workspaceId/$projectId/campaigns'
  | '/app/$workspaceId/$projectId/session-replay'
  | '/app/$workspaceId/$projectId/heatmaps'
  | '/app/$workspaceId/$projectId/visitors'
  | '/app/$workspaceId/$projectId/errors'
  | '/app/$workspaceId/$projectId/performance'
  | '/app/$workspaceId/$projectId/reports'
  | '/app/$workspaceId/$projectId/ai-insights'
  | '/app/$workspaceId/$projectId/usage'
  | '/app/$workspaceId/$projectId/audit-logs'
  | '/app/$workspaceId/$projectId/domains'
  | '/app/$workspaceId/$projectId/api-keys'
  | '/app/$workspaceId/$projectId/settings'

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

/* -------------------------------------------------------------------------- */
/* App pages                                                                  */
/* -------------------------------------------------------------------------- */

const appPageDefinitions: PageDefinition<AppPagePath>[] = [
  {
    id: 'account',
    title: 'Account',
    description: 'Manage your profile and account preferences',
    keywords: 'account profile preferences security password',
    icon: navigationIcons.settings,
    to: '/app/account',
  },
]

/* -------------------------------------------------------------------------- */
/* Workspace pages                                                            */
/* -------------------------------------------------------------------------- */

const workspacePageDefinitions: PageDefinition<WorkspacePagePath>[] = [
  {
    id: 'workspace-projects',
    title: 'Projects',
    description: 'Browse projects in this workspace',
    keywords: 'workspace projects sites properties',
    icon: navigationIcons.projects,
    to: '/app/$workspaceId',
  },
  {
    id: 'workspace-team',
    title: 'Team',
    description: 'Manage workspace team members',
    keywords: 'team members users people invite workspace',
    icon: navigationIcons.team,
    to: '/app/$workspaceId/team',
  },
  {
    id: 'workspace-permissions',
    title: 'Permissions',
    description: 'Manage workspace permissions and access',
    keywords: 'permissions access roles security workspace',
    icon: navigationIcons.permissions,
    to: '/app/$workspaceId/permissions',
  },
  {
    id: 'workspace-usage',
    title: 'Usage',
    description: 'Review workspace usage and limits',
    keywords: 'usage limits consumption workspace',
    icon: navigationIcons.usage,
    to: '/app/$workspaceId/usage',
  },
  {
    id: 'workspace-audit-logs',
    title: 'Audit Logs',
    description: 'Review workspace activity and audit logs',
    keywords: 'audit logs activity history workspace security',
    icon: navigationIcons.audit,
    to: '/app/$workspaceId/audit-logs',
  },
  {
    id: 'workspace-settings',
    title: 'Workspace Settings',
    description: 'Manage workspace details and configuration',
    keywords: 'workspace configuration general settings',
    icon: navigationIcons.workspaceSettings,
    to: '/app/$workspaceId/settings',
  },
]

/* -------------------------------------------------------------------------- */
/* Project pages                                                              */
/* -------------------------------------------------------------------------- */

const projectPageDefinitions: PageDefinition<ProjectPagePath>[] = [
  /* ------------------------------ Overview ------------------------------ */

  {
    id: 'project-dashboard',
    title: 'Dashboard',
    description: 'See the most important project signals',
    keywords: 'overview dashboard metrics traffic visitors analytics',
    icon: navigationIcons.dashboard,
    to: '/app/$workspaceId/$projectId',
    permissions: ['analytics.dashboard.view'],
  },

  /* ------------------------------ Analytics ----------------------------- */

  {
    id: 'project-user-journey',
    title: 'User Journey',
    description: 'Explore the paths visitors take through your site',
    keywords: 'path analysis journey flow paths navigation behavior visitors',
    icon: navigationIcons.userJourney,
    to: '/app/$workspaceId/$projectId/user-journey',
    permissions: ['analytics.analytics.view'],
  },
  {
    id: 'project-goals',
    title: 'Goals',
    description: 'Track important conversion goals',
    keywords: 'conversion targets goals objectives conversions',
    icon: navigationIcons.goals,
    to: '/app/$workspaceId/$projectId/goals',
    permissions: ['analytics.goals.view'],
  },
  {
    id: 'project-events',
    title: 'Events',
    description: 'Monitor important visitor actions',
    keywords: 'activity clicks forms actions events tracking',
    icon: navigationIcons.events,
    to: '/app/$workspaceId/$projectId/events',
    permissions: ['analytics.events.view'],
  },
  {
    id: 'project-campaigns',
    title: 'Campaigns',
    description: 'Track campaign traffic and attribution',
    keywords:
      'utm source medium campaign attribution visitors conversion marketing',
    icon: navigationIcons.campaigns,
    to: '/app/$workspaceId/$projectId/campaigns',
    permissions: ['analytics.goals.view'],
  },

  /* ------------------------------ Behavior ------------------------------ */

  {
    id: 'project-session-replay',
    title: 'Session Replay',
    description: 'Watch recordings of visitor sessions',
    keywords: 'recordings behavior playback sessions replay',
    icon: navigationIcons.sessionReplay,
    to: '/app/$workspaceId/$projectId/session-replay',
    permissions: ['analytics.session_replay.view'],
  },
  {
    id: 'project-heatmaps',
    title: 'Heatmaps',
    description: 'See where visitors click and how far they scroll',
    keywords: 'clicks scroll behavior page maps attention heatmap',
    icon: navigationIcons.heatmaps,
    to: '/app/$workspaceId/$projectId/heatmaps',
    permissions: ['analytics.analytics.view'],
  },
  {
    id: 'project-visitors',
    title: 'Visitors',
    description: 'Inspect visitors and their activity',
    keywords: 'users people audience live visitors',
    icon: navigationIcons.visitors,
    to: '/app/$workspaceId/$projectId/visitors',
    permissions: ['analytics.visitors.view'],
  },
  {
    id: 'project-errors',
    title: 'Errors',
    description: 'Monitor JavaScript errors and rejected promises',
    keywords: 'errors exceptions bugs stack traces crashes monitoring',
    icon: navigationIcons.errors,
    to: '/app/$workspaceId/$projectId/errors',
    permissions: ['analytics.analytics.view'],
  },

  /* ---------------------------- Performance ----------------------------- */

  {
    id: 'project-performance',
    title: 'Performance',
    description: 'Review page speed and loading performance',
    keywords: 'speed timing web vitals load performance lcp cls inp ttfb',
    icon: navigationIcons.performance,
    to: '/app/$workspaceId/$projectId/performance',
    permissions: ['analytics.performance.view'],
  },
  /* ------------------------------- Insights ----------------------------- */

  {
    id: 'project-reports',
    title: 'Reports',
    description: 'Review generated project reports',
    keywords: 'analytics exports reporting reports data insights',
    icon: navigationIcons.reports,
    to: '/app/$workspaceId/$projectId/reports',
    permissions: ['analytics.reports.view'],
  },
  {
    id: 'project-ai-insights',
    title: 'AI Insights',
    description: 'Review generated observations and opportunities',
    keywords:
      'artificial intelligence recommendations insights ai analysis opportunities',
    icon: navigationIcons.aiInsights,
    to: '/app/$workspaceId/$projectId/ai-insights',
    permissions: ['analytics.ai_insights.view'],
  },

  /* ------------------------------ Workspace ----------------------------- */

  {
    id: 'project-usage',
    title: 'Usage',
    description: 'Review project usage and resource consumption',
    keywords: 'usage limits consumption resources tracking events',
    icon: navigationIcons.usage,
    to: '/app/$workspaceId/$projectId/usage',
    permissions: ['project.usage.view'],
  },
  {
    id: 'project-audit-logs',
    title: 'Audit Logs',
    description: 'Review project activity and audit logs',
    keywords: 'audit logs activity history security events',
    icon: navigationIcons.audit,
    to: '/app/$workspaceId/$projectId/audit-logs',
    permissions: ['project.audit_logs.view'],
  },

  /* ---------------------------- Configuration --------------------------- */

  {
    id: 'project-domains',
    title: 'Domains',
    description: 'Manage domains connected to your project',
    keywords: 'domains website hostname urls allowed domains configuration',
    icon: navigationIcons.domain,
    to: '/app/$workspaceId/$projectId/domains',
    permissions: ['project.domains.view'],
  },
  {
    id: 'project-api-keys',
    title: 'API Keys',
    description: 'Manage project API and tracking keys',
    keywords: 'api keys tracker integration credentials tokens',
    icon: navigationIcons.apiKeys,
    to: '/app/$workspaceId/$projectId/api-keys',
    permissions: ['project.api_keys.view'],
  },
  {
    id: 'project-settings',
    title: 'Settings',
    description: 'Manage project details and configuration',
    keywords: 'project configuration general settings',
    icon: navigationIcons.settings,
    to: '/app/$workspaceId/$projectId/settings',
    permissions: ['project.settings.view'],
  },
]

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export const SearchOverAppDialog = ({
  workspaceId,
  projectId,
}: {
  workspaceId?: string
  projectId?: string
}) => {
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const resultRefs = useRef<Array<HTMLButtonElement | null>>([])

  const deferredSearch = useDeferredValue(search)

  /* ------------------------------------------------------------------------ */
  /* Queries                                                                  */
  /* ------------------------------------------------------------------------ */

  const workspacesQuery = useQuery({
    ...getWorkspacesOptions(),
    enabled: open,
  })

  const workspaces = workspacesQuery.data?.data ?? []

  const projectQueries = useQueries({
    queries: workspaces.map((workspace) => ({
      ...getProjectsOptions({
        workspace_id: workspace.id,
      }),
      enabled: open,
    })),
  })

  const projects = projectQueries.flatMap((query) => query.data?.data ?? [])

  const activeWorkspace = workspaceId
    ? workspaces.find((workspace) => workspace.id === workspaceId)
    : undefined

  /* ------------------------------------------------------------------------ */
  /* Keyboard shortcut                                                        */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener('keydown', handleShortcut)

    return () => {
      document.removeEventListener('keydown', handleShortcut)
    }
  }, [])

  /* ------------------------------------------------------------------------ */
  /* Focus                                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!open) return

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [open])

  /* ------------------------------------------------------------------------ */
  /* Dialog                                                                   */
  /* ------------------------------------------------------------------------ */

  const closeDialog = () => {
    setOpen(false)
    setSearch('')
    setActiveIndex(0)
  }

  /* ------------------------------------------------------------------------ */
  /* Navigation                                                                */
  /* ------------------------------------------------------------------------ */

  const navigateToAppPage = (page: PageDefinition<AppPagePath>) => {
    closeDialog()

    navigate({
      to: page.to,
    })
  }

  const navigateToWorkspacePage = (page: PageDefinition<WorkspacePagePath>) => {
    if (!workspaceId) return

    closeDialog()

    navigate({
      to: page.to,
      params: {
        workspaceId,
      },
    })
  }

  const navigateToProjectPage = (page: PageDefinition<ProjectPagePath>) => {
    if (!workspaceId || !projectId) return

    closeDialog()

    navigate({
      to: page.to,
      params: {
        workspaceId,
        projectId,
      },
    })
  }

  /* ------------------------------------------------------------------------ */
  /* Page results                                                              */
  /* ------------------------------------------------------------------------ */

  const appPageResults: SearchResult[] = appPageDefinitions.map((page) => ({
    ...page,
    category: 'Pages' as const,
    onSelect: () => navigateToAppPage(page),
  }))

  const workspacePageResults: SearchResult[] = workspaceId
    ? workspacePageDefinitions
        .filter((page) => hasPermission(activeWorkspace, page.permissions))
        .map((page) => ({
          ...page,
          category: 'Pages' as const,
          onSelect: () => navigateToWorkspacePage(page),
        }))
    : []

  const projectPageResults: SearchResult[] =
    workspaceId && projectId
      ? projectPageDefinitions
          .filter((page) => hasPermission(activeWorkspace, page.permissions))
          .map((page) => ({
            ...page,
            category: 'Pages' as const,
            onSelect: () => navigateToProjectPage(page),
          }))
      : []

  const pageResults: SearchResult[] = [
    ...appPageResults,
    ...workspacePageResults,
    ...projectPageResults,
  ]

  /* ------------------------------------------------------------------------ */
  /* Workspace results                                                         */
  /* ------------------------------------------------------------------------ */

  const workspaceResults: SearchResult[] = workspaces.map((workspace) => ({
    id: `workspace-${workspace.id}`,
    title: workspace.name,
    description: `${workspace.projectCount} ${
      workspace.projectCount === 1 ? 'project' : 'projects'
    }`,
    keywords: `${workspace.name} workspace ${workspace.role ?? ''}`,
    category: 'Workspaces',
    icon: navigationIcons.projects,

    onSelect: () => {
      closeDialog()

      navigate({
        to: '/app/$workspaceId',
        params: {
          workspaceId: workspace.id,
        },
      })
    },
  }))

  /* ------------------------------------------------------------------------ */
  /* Project results                                                           */
  /* ------------------------------------------------------------------------ */

  const projectResults: SearchResult[] = projects.flatMap((project) => {
    const workspace = workspaces.find((item) => item.id === project.workspaceId)

    if (!workspace) return []

    return [
      {
        id: `project-${project.id}`,
        title: project.name,
        description: `${workspace.name}${
          project.domain ? ` · ${project.domain}` : ''
        }`,
        keywords: `${project.name} ${
          project.description ?? ''
        } ${project.domain ?? ''}`,
        category: 'Projects' as const,
        icon: navigationIcons.projects,

        onSelect: () => {
          closeDialog()

          navigate({
            to: '/app/$workspaceId/$projectId',
            params: {
              workspaceId: project.workspaceId,
              projectId: project.id,
            },
          })
        },
      },
    ]
  })

  /* ------------------------------------------------------------------------ */
  /* Filtering                                                                 */
  /* ------------------------------------------------------------------------ */

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
        .map((result, index) => ({
          result,
          index,
        }))
        .filter(({ result }) => result.category === category),
    }))
    .filter((section) => section.results.length > 0)

  const activeResult = filteredResults[activeIndex]

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                   */
  /* ------------------------------------------------------------------------ */

  const isEntityLoading =
    open &&
    (workspacesQuery.isPending ||
      projectQueries.some((query) => query.isPending))

  /* ------------------------------------------------------------------------ */
  /* Keyboard navigation                                                      */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Result synchronization                                                    */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (activeIndex >= filteredResults.length) {
      setActiveIndex(0)
    }
  }, [activeIndex, filteredResults.length])

  useEffect(() => {
    resultRefs.current[activeIndex]?.scrollIntoView({
      block: 'nearest',
    })
  }, [activeIndex])

  /* ------------------------------------------------------------------------ */
  /* Render                                                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : closeDialog())}
    >
      <DialogTrigger
        render={
          <Button
            className="text-muted-foreground justify-between gap-4"
            variant="outline"
            aria-label="Quick Search"
          >
            <span className="flex items-center gap-2">
              <SearchIcon />
              <span>Quick Search...</span>
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

        {/* Search input */}
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

        {/* Results */}
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

          {!filteredResults.length && !isEntityLoading && (
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

        {/* Footer */}
        <div className="text-muted-foreground flex items-center justify-between border-t px-3 py-2 text-xs">
          <span>Use arrow keys to navigate</span>
          <span>Enter to open · Esc to close</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
