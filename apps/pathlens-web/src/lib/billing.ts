import { useSyncExternalStore } from 'react'

export const PLAN_IDS = ['starter', 'pro', 'business'] as const

export type PlanId = (typeof PLAN_IDS)[number]

export type PlanFeature =
  | 'advancedAnalytics'
  | 'userJourney'
  | 'funnels'
  | 'goals'
  | 'sessionReplay'
  | 'heatmaps'
  | 'errorTracking'
  | 'campaignTracking'
  | 'performanceAnalytics'
  | 'reports'
  | 'advancedReports'
  | 'aiInsights'
  | 'apiAccess'
  | 'advancedPermissions'
  | 'multipleWorkspaces'
  | 'customDashboards'
  | 'scheduledReports'
  | 'whiteLabelReports'
  | 'advancedApi'
  | 'dataExport'
  | 'sso'
  | 'auditLogs'

export interface PlanDefinition {
  id: PlanId
  name: string
  price: number
  description: string
  features: readonly string[]
  capabilities: readonly PlanFeature[]
  highlighted?: boolean
  limits: {
    pageViews: number
    events: number
    projects: number | null
    members: number | null
    workspaces: number | null
    funnels: number | null
    goals: number | null
    sessionRecordings: number
    heatmapPages: number | null
    retentionDays: number
  }
}

export const PLAN_TIERS: readonly PlanDefinition[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    description: 'For developers and small projects getting started.',
    features: [
      '10K page views / month',
      '1 project',
      'Basic Analytics',
      'Events',
      'Visitors',
      '1 funnel',
      '1 goal',
      '7-day data retention',
      'Basic performance',
      '100 session recordings / month',
      '1 page of heatmaps',
      'Basic reports',
      'Community support',
    ],
    capabilities: [
      'funnels',
      'goals',
      'sessionReplay',
      'heatmaps',
      'performanceAnalytics',
      'reports',
    ],
    limits: {
      pageViews: 10_000,
      events: 25_000,
      projects: 1,
      members: 1,
      workspaces: 1,
      funnels: 1,
      goals: 1,
      sessionRecordings: 100,
      heatmapPages: 1,
      retentionDays: 7,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    description: 'For growing products that need deeper user insight.',
    features: [
      '1M page views / month',
      '10 projects',
      'Advanced Analytics',
      'User Journey',
      'Funnels — unlimited',
      'Goals — unlimited',
      'Session Replay — 10K recordings / month',
      'Heatmaps — unlimited',
      'Error Tracking',
      'Campaign Tracking',
      'Performance Analytics',
      'Reports & exports',
      'AI Insights',
      '90-day data retention',
      '5 team members',
      'API access',
      'Priority email support',
    ],
    capabilities: [
      'advancedAnalytics',
      'userJourney',
      'funnels',
      'goals',
      'sessionReplay',
      'heatmaps',
      'errorTracking',
      'campaignTracking',
      'performanceAnalytics',
      'reports',
      'advancedReports',
      'aiInsights',
      'apiAccess',
      'dataExport',
    ],
    highlighted: true,
    limits: {
      pageViews: 1_000_000,
      events: 250_000,
      projects: 10,
      members: 5,
      workspaces: 1,
      funnels: null,
      goals: null,
      sessionRecordings: 10_000,
      heatmapPages: null,
      retentionDays: 90,
    },
  },
  {
    id: 'business',
    name: 'Business',
    price: 149,
    description: 'For teams that need scale, security, and control.',
    features: [
      '10M page views / month',
      'Unlimited projects',
      'Everything in Pro',
      'Session Replay — 100K recordings / month',
      '1-year data retention',
      'Unlimited team members',
      'SSO / SAML',
      'Audit logs',
      'Advanced permissions',
      'Multiple workspaces',
      'Custom dashboards',
      'Scheduled reports',
      'White-label reports',
      'Advanced API limits',
      'Data export',
      'Dedicated support',
    ],
    capabilities: [
      'advancedAnalytics',
      'userJourney',
      'funnels',
      'goals',
      'sessionReplay',
      'heatmaps',
      'errorTracking',
      'campaignTracking',
      'performanceAnalytics',
      'reports',
      'advancedReports',
      'aiInsights',
      'apiAccess',
      'advancedPermissions',
      'multipleWorkspaces',
      'customDashboards',
      'scheduledReports',
      'whiteLabelReports',
      'advancedApi',
      'dataExport',
      'sso',
      'auditLogs',
    ],
    limits: {
      pageViews: 10_000_000,
      events: 2_500_000,
      projects: null,
      members: null,
      workspaces: null,
      funnels: null,
      goals: null,
      sessionRecordings: 100_000,
      heatmapPages: null,
      retentionDays: 365,
    },
  },
] as const

export const DEFAULT_PLAN_ID: PlanId = 'starter'

const STORAGE_KEY = 'pathlens-workspace-plans'
type StoredPlans = Partial<Record<string, PlanId>>

let storedPlans: StoredPlans | null = null
const listeners = new Set<() => void>()

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && PLAN_IDS.includes(value as PlanId)
}

function readStoredPlans(): StoredPlans {
  if (typeof window === 'undefined') return {}

  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '{}'
    )

    if (!parsed || typeof parsed !== 'object') return {}

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isPlanId(value))
    ) as StoredPlans
  } catch {
    return {}
  }
}

function getStoredPlans(): StoredPlans {
  storedPlans ??= readStoredPlans()

  return storedPlans
}

function notify(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  if (listeners.size === 1 && typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageChange)
  }

  return () => {
    listeners.delete(listener)

    if (listeners.size === 0 && typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageChange)
    }
  }
}

function handleStorageChange(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return

  storedPlans = null
  notify()
}

export function getWorkspacePlan(workspaceId: string): PlanId {
  return getStoredPlans()[workspaceId] ?? DEFAULT_PLAN_ID
}

export function setWorkspacePlan(workspaceId: string, planId: PlanId): void {
  const nextPlans = {
    ...getStoredPlans(),
    [workspaceId]: planId,
  }

  storedPlans = nextPlans

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextPlans))
    } catch {
      // Keep the current tab functional when storage is unavailable.
    }
  }

  notify()
}

export function useWorkspacePlan(workspaceId: string): PlanId {
  return useSyncExternalStore(
    subscribe,
    () => getWorkspacePlan(workspaceId),
    () => DEFAULT_PLAN_ID
  )
}

export function getPlanDefinition(planId: PlanId): PlanDefinition {
  return PLAN_TIERS.find((plan) => plan.id === planId) ?? PLAN_TIERS[0]
}

export function hasPlanFeature(planId: PlanId, feature: PlanFeature): boolean {
  return getPlanDefinition(planId).capabilities.includes(feature)
}

export function getRequiredPlan(feature: PlanFeature): PlanId {
  const businessFeatures: PlanFeature[] = [
    'advancedPermissions',
    'multipleWorkspaces',
    'customDashboards',
    'scheduledReports',
    'whiteLabelReports',
    'advancedApi',
    'sso',
    'auditLogs',
  ]

  return businessFeatures.includes(feature) ? 'business' : 'pro'
}
