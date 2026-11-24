import { getWorkspacePermissionsOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { DomainSwitcher } from '../-components/common/domain-switcher'
import { getProjectDomainsOptions } from '@/queries/domains'
import { useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/ab-testing/'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId, workspaceId } = Route.useParams()

  const [domain, setDomain] = useState('')

  const {
    data: permissionsData,
    isLoading: permissionsLoading,
    error: permissionsError,
    refetch: refetchPermissions,
    isRefetching: permissionsRefetching,
  } = useQuery(getWorkspacePermissionsOptions(workspaceId))

  const permissions = permissionsData?.data
  const hasViewPermission = permissions?.includes('analytics.goals.view')
  const hasManagePermission = permissions?.includes('analytics.goals.manage')

  const {
    data: domainsData,
    isLoading: domainsLoading,
    error: domainsError,
    refetch: refetchDomains,
    isRefetching: domainsRefetching,
  } = useQuery({
    ...getProjectDomainsOptions(projectId),
    enabled: !!hasViewPermission,
  })
  const domains = domainsData?.data ?? []
  const activeDomain = domain || domains?.[0]?.domain || ''

  const globalLoading = domainsLoading || permissionsLoading

  return (
    <div className="">
      {permissionsLoading ? (
        <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
          <Skeleton className={'h-8 w-60'} />

          <div className="flex items-center gap-2">
            <Skeleton className={'h-8 w-30'} />
            <Skeleton className={'h-8 w-30'} />
            <Skeleton className={'h-8 w-30'} />
          </div>
        </div>
      ) : hasViewPermission ? (
        <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
          <div className="flex items-center gap-4">
            <DomainSwitcher
              loading={globalLoading}
              domain={activeDomain}
              setDomain={setDomain}
              domains={domains!}
              refetch={() => {}}
            />
          </div>
        </div>
      ) : (
        <></>
      )}

      <div className="mx-auto space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-medium">A/B Testing</p>
            <p className="text-muted-foreground text-sm">
              Create experiments, compare variants, and discover what performs
              best.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
