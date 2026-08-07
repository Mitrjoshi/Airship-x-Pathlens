export const PERMISSIONS = [
  'workspace.view',
  'workspace.settings.view',
  'workspace.settings.update',
  'workspace.delete',
  'workspace.members.view',
  'workspace.members.invite',
  'workspace.members.update',
  'workspace.members.remove',
  'workspace.permission_profiles.view',
  'workspace.permission_profiles.create',
  'workspace.permission_profiles.update',
  'workspace.permission_profiles.delete',
  'projects.view',
  'projects.create',
  'projects.delete',
  'project.settings.view',
  'project.settings.update',
  'project.api_keys.view',
  'analytics.dashboard.view',
  'analytics.analytics.view',
  'analytics.visitors.view',
  'analytics.events.view',
  'analytics.session_replay.view',
  'analytics.performance.view',
  'analytics.funnels.view',
  'analytics.funnels.manage',
  'analytics.goals.view',
  'analytics.goals.manage',
  'analytics.reports.view',
  'analytics.reports.export',
  'analytics.ai_insights.view',
] as const

export type Permission = (typeof PERMISSIONS)[number]

export type PermissionDefinition = {
  key: Permission
  label: string
  description: string
}

export type PermissionGroupDefinition = {
  id: string
  label: string
  description: string
  permissions: readonly PermissionDefinition[]
}

export const PERMISSION_GROUPS = [
  {
    id: 'workspace',
    label: 'Workspace',
    description: 'Control workspace settings, members, and access profiles.',
    permissions: [
      {
        key: 'workspace.view',
        label: 'View workspace',
        description: 'See and switch between workspaces.',
      },
      {
        key: 'workspace.settings.view',
        label: 'View workspace settings',
        description: 'Open workspace settings and access summaries.',
      },
      {
        key: 'workspace.settings.update',
        label: 'Edit workspace settings',
        description: 'Change the workspace name and configuration.',
      },
      {
        key: 'workspace.delete',
        label: 'Delete workspace',
        description: 'Permanently delete the workspace and its data.',
      },
      {
        key: 'workspace.members.view',
        label: 'View members',
        description: 'See workspace members and pending invitations.',
      },
      {
        key: 'workspace.members.invite',
        label: 'Invite members',
        description: 'Send invitations to existing PathLens users.',
      },
      {
        key: 'workspace.members.update',
        label: 'Change member permissions',
        description: 'Assign a different permission profile to a member.',
      },
      {
        key: 'workspace.members.remove',
        label: 'Remove members',
        description: 'Remove a member from the workspace.',
      },
      {
        key: 'workspace.permission_profiles.view',
        label: 'View permission profiles',
        description: 'Review profiles and their assigned permissions.',
      },
      {
        key: 'workspace.permission_profiles.create',
        label: 'Create permission profiles',
        description: 'Create reusable access profiles.',
      },
      {
        key: 'workspace.permission_profiles.update',
        label: 'Edit permission profiles',
        description: 'Change a profile name, description, or permissions.',
      },
      {
        key: 'workspace.permission_profiles.delete',
        label: 'Delete permission profiles',
        description: 'Delete profiles that are no longer assigned.',
      },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    description: 'Control which projects a member can access and manage.',
    permissions: [
      {
        key: 'projects.view',
        label: 'View projects',
        description: 'See projects and project summary information.',
      },
      {
        key: 'projects.create',
        label: 'Create projects',
        description: 'Connect a new site to the workspace.',
      },
      {
        key: 'projects.delete',
        label: 'Delete projects',
        description: 'Permanently delete projects and their analytics data.',
      },
      {
        key: 'project.settings.view',
        label: 'View project settings',
        description: 'Open project configuration and tracking settings.',
      },
      {
        key: 'project.settings.update',
        label: 'Edit project settings',
        description: 'Change project configuration and tracking preferences.',
      },
      {
        key: 'project.api_keys.view',
        label: 'View project API keys',
        description: 'See and copy the project tracking key and script.',
      },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    description: 'Control access to analytics views and analysis tools.',
    permissions: [
      {
        key: 'analytics.dashboard.view',
        label: 'View dashboard',
        description: 'See project metrics, trends, and live activity.',
      },
      {
        key: 'analytics.analytics.view',
        label: 'View analytics',
        description: 'See traffic, device, country, and referrer analysis.',
      },
      {
        key: 'analytics.visitors.view',
        label: 'View visitors',
        description: 'See visitor lists, status, and session summaries.',
      },
      {
        key: 'analytics.events.view',
        label: 'View events',
        description: 'Browse captured events and event summaries.',
      },
      {
        key: 'analytics.session_replay.view',
        label: 'View session replay',
        description: 'Watch recorded visitor sessions.',
      },
      {
        key: 'analytics.performance.view',
        label: 'View performance',
        description: 'See page performance and timing metrics.',
      },
      {
        key: 'analytics.funnels.view',
        label: 'View funnels',
        description: 'Review funnel conversion and step performance.',
      },
      {
        key: 'analytics.funnels.manage',
        label: 'Manage funnels',
        description: 'Create, edit, and delete funnels.',
      },
      {
        key: 'analytics.goals.view',
        label: 'View goals',
        description: 'Review goal progress and status.',
      },
      {
        key: 'analytics.goals.manage',
        label: 'Manage goals',
        description: 'Create, edit, and delete goals.',
      },
      {
        key: 'analytics.reports.view',
        label: 'View reports',
        description: 'Review report charts and breakdowns.',
      },
      {
        key: 'analytics.reports.export',
        label: 'Export reports',
        description: 'Download analytics reports as CSV files.',
      },
      {
        key: 'analytics.ai_insights.view',
        label: 'View AI insights',
        description: 'Review generated trends, anomalies, and opportunities.',
      },
    ],
  },
] as const satisfies readonly PermissionGroupDefinition[]

export const DEFAULT_VIEWER_PERMISSIONS = [
  'workspace.view',
  'workspace.settings.view',
  'workspace.members.view',
  'workspace.permission_profiles.view',
  'projects.view',
  'project.settings.view',
  'project.api_keys.view',
  'analytics.dashboard.view',
  'analytics.analytics.view',
  'analytics.visitors.view',
  'analytics.events.view',
  'analytics.session_replay.view',
  'analytics.performance.view',
  'analytics.funnels.view',
  'analytics.goals.view',
  'analytics.reports.view',
  'analytics.ai_insights.view',
] as const satisfies readonly Permission[]

export const DEFAULT_FULL_ACCESS_PERMISSIONS = PERMISSIONS

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value)
}
