import { useLifetimeCheckout } from '@/mutations/billing'
import { getWorkspaceByIdOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { AlertTriangleIcon } from 'lucide-react'

export const GracePeriod = () => {
  const { workspaceId } = useParams({
    from: '/app/$workspaceId',
  })

  const { data: workspaceData } = useQuery(getWorkspaceByIdOptions(workspaceId))
  const { mutate, isPending } = useLifetimeCheckout()

  const graceData = workspaceData?.data

  const showWarning = graceData?.usageWarningAt
  // const showWarning = true
  const showEnd = graceData?.usagePausedAt
  // const showEnd = true

  const actionMessage = showWarning
    ? 'Your workspace is in a grace period. Please upgrade to continue using Pathlens.'
    : 'Your grace period has ended. Please upgrade to continue using Pathlens.'

  return (
    (showWarning || showEnd) && (
      <div className="relative border p-2">
        {/* Gradient border */}
        <div
          className="pointer-events-none absolute -inset-px"
          style={{
            background: `linear-gradient(225deg,
  ${showWarning ? 'var(--color-yellow-400)' : 'var(--destructive)'} 0%,
  ${showWarning ? 'var(--color-yellow-400)' : 'var(--destructive)'} 12%,
  transparent 65%
)`,
            padding: '1px',
            WebkitMask:
              'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Action Required</p>
            <AlertTriangleIcon
              className={`${showWarning ? 'text-yellow-400' : 'text-destructive'} size-5`}
            />
          </div>

          <p className="text-muted-foreground text-sm">{actionMessage}</p>

          <Button
            onClick={() => {
              mutate()
            }}
            disabled={isPending}
            className="w-full"
            variant="outline"
          >
            <LoadingSwap isLoading={isPending}>
              Upgrade to Unlimited
            </LoadingSwap>
          </Button>
        </div>
      </div>
    )
  )
}
