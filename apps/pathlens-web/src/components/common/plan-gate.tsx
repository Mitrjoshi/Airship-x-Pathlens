import { ProjectPageLayout } from '@/components/common/project-page'
import {
  getPlanDefinition,
  getRequiredPlan,
  hasPlanFeature,
  useWorkspacePlan,
  type PlanFeature,
} from '@/lib/billing'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Link } from '@tanstack/react-router'
import { LockKeyhole } from 'lucide-react'
import type { ReactNode } from 'react'

export function PlanGate({
  workspaceId,
  feature,
  children,
}: {
  workspaceId: string
  feature: PlanFeature
  children: ReactNode
}) {
  const currentPlanId = useWorkspacePlan(workspaceId)

  if (hasPlanFeature(currentPlanId, feature)) return children

  const requiredPlan = getPlanDefinition(getRequiredPlan(feature))

  return (
    <ProjectPageLayout>
      <Card>
        <CardContent className="flex min-h-80 flex-col items-center justify-center px-5 text-center">
          <div className="bg-muted mb-4 rounded-full p-3">
            <LockKeyhole className="text-muted-foreground size-6" />
          </div>
          <Badge variant="outline">{requiredPlan.name} plan</Badge>
          <p className="mt-4 text-lg font-semibold">
            Upgrade to unlock this view
          </p>
          <p className="text-muted-foreground mt-2 max-w-md text-sm leading-6">
            Your {getPlanDefinition(currentPlanId).name} plan does not include
            this feature. Upgrade your workspace to continue.
          </p>
          <Button
            className="mt-6"
            render={
              <Link
                to="/app/$workspace/billing"
                params={{ workspace: workspaceId }}
              />
            }
          >
            View plans
          </Button>
        </CardContent>
      </Card>
    </ProjectPageLayout>
  )
}

export function PlanLimitNotice({
  workspaceId,
  resource,
  limit,
}: {
  workspaceId: string
  resource: string
  limit: number
}) {
  const currentPlanId = useWorkspacePlan(workspaceId)
  const currentPlan = getPlanDefinition(currentPlanId)
  const resourceLabel = limit === 1 ? resource : `${resource}s`

  return (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground">
        Your {currentPlan.name} plan allows {limit} {resourceLabel}.
      </p>
      <Button
        size="sm"
        variant="outline"
        render={
          <Link
            to="/app/$workspace/billing"
            params={{ workspace: workspaceId }}
          />
        }
      >
        Upgrade plan
      </Button>
    </div>
  )
}

export function PlanFeatureNotice({
  workspaceId,
  feature,
  description,
}: {
  workspaceId: string
  feature: PlanFeature
  description: string
}) {
  const currentPlanId = useWorkspacePlan(workspaceId)

  if (hasPlanFeature(currentPlanId, feature)) return null

  const requiredPlan = getPlanDefinition(getRequiredPlan(feature))

  return (
    <div className="bg-muted/40 flex flex-col gap-3 rounded-xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <LockKeyhole className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div>
          <Badge variant="outline">{requiredPlan.name} plan</Badge>
          <p className="text-muted-foreground mt-2">{description}</p>
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0"
        render={
          <Link
            to="/app/$workspace/billing"
            params={{ workspace: workspaceId }}
          />
        }
      >
        View plans
      </Button>
    </div>
  )
}
