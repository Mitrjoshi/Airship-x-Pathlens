import { getUsageOptions } from '@/queries/usage'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/$workspaceId/$projectId/usage')({
  component: RouteComponent,
})

const usageItems = [
  {
    key: 'goals',
    label: 'Goals',
  },
  {
    key: 'events',
    label: 'Events',
  },
  {
    key: 'funnels',
    label: 'Funnels',
  },
  {
    key: 'heatmapPages',
    label: 'Heatmap Pages',
  },
  {
    key: 'pageViews',
    label: 'Page Views',
  },
  {
    key: 'recordings',
    label: 'Recordings',
  },
] as const

interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
}

function CircularProgress({
  value,
  size = 80,
  strokeWidth = 4,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max(value, 0), 100)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Background */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />

        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-primary transition-all duration-500"
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-semibold">{percentage.toFixed(0)}%</span>
      </div>
    </div>
  )
}

function RouteComponent() {
  const { workspaceId, projectId } = Route.useParams()

  const { data: usageData, isLoading: usageLoading } = useQuery(
    getUsageOptions(workspaceId, projectId)
  )

  const usage = usageData?.data
  const projectUsage = usage?.projectBreakdown?.[0]
  const limits = usage?.limits

  return (
    <div>
      <div className="mx-auto space-y-6 p-6">
        <div>
          <p className="text-xl font-medium">Usage</p>

          <p className="text-muted-foreground text-sm">
            Monitor your project usage, limits, and resource consumption.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {usageItems.map(({ key, label }) => {
            const value = projectUsage?.[key] ?? 0
            const limit = limits?.[key] ?? 0

            const percentage =
              limit > 0 ? Math.min((value / limit) * 100, 100) : 0

            return (
              <div
                key={key}
                className="bg-card/30 flex items-center justify-between gap-4 border-2 border-dashed p-2 px-4"
              >
                <div className="space-y-1">
                  <p className="font-medium">{label}</p>

                  <p className="text-muted-foreground text-sm">
                    {value.toLocaleString()} / {limit.toLocaleString()}
                  </p>

                  <p className="text-muted-foreground text-xs">
                    {percentage.toFixed(1)}% used
                  </p>
                </div>

                <CircularProgress value={percentage} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
