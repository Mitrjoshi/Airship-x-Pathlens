import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  ProjectPanel,
} from '@/components/common/project-page'
import { createFileRoute } from '@tanstack/react-router'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { ActivityIcon, Copy, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { getProjectsOptions } from '@/queries/projects'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

const TRACKER_SCRIPT_URL = 'http://localhost:3000/dist/tracker.global.js'

export const Route = createFileRoute('/app/$workspace/projects/$project/keys')({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspace, project } = Route.useParams()
  const [showKey, setShowKey] = useState(false)

  const { data, isPending } = useQuery(
    getProjectsOptions({
      workspace_id: workspace,
      project_id: project,
    })
  )

  const projectData = data?.data[0]
  const apiKey = projectData?.apiKey ?? ''

  const maskedKey = apiKey
    ? `${apiKey.slice(0, 7)}${'*'.repeat(apiKey.length - 7)}`
    : ''

  const trackerScript = `<script
  async
  src="${TRACKER_SCRIPT_URL}"
  data-project-id="${apiKey}"
></script>`

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey)
    toast.success('API key copied to clipboard')
  }

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Developer tools"
          title="API Keys"
          description="Manage API keys for your project."
        />

        <ProjectMetricStrip className="lg:grid-cols-3">
          {isPending ? (
            <>
              <ProjectMetricSkeleton />
              <ProjectMetricSkeleton />
              <ProjectMetricSkeleton />
            </>
          ) : (
            <>
              <ProjectMetric label="Total keys" value="1" icon={KeyRound} />
              <ProjectMetric
                label="Status"
                value={
                  projectData?.stats?.status === 'active'
                    ? 'Active'
                    : 'Inactive'
                }
                icon={Eye}
              />
              <ProjectMetric
                label="Visitors"
                value={formatCompact(projectData?.stats?.visitors ?? 0)}
                icon={ActivityIcon}
              />
            </>
          )}
        </ProjectMetricStrip>

        <ProjectPanel>
          <CardHeader className="border-b px-5 py-5">
            <CardTitle>Your API Key</CardTitle>
            <CardDescription>
              Keep your API key secure. Never expose it publicly.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-5">
            {isPending ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full" />
              </div>
            ) : projectData ? (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <KeyRound className="text-primary h-4 w-4" />
                      <h3 className="font-medium">{projectData.name}</h3>
                      <Badge
                        variant={
                          projectData.stats?.status === 'active'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {projectData.stats?.status === 'active'
                          ? 'Active'
                          : 'Inactive'}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground mt-1 text-sm">
                      Created{' '}
                      {new Date(projectData.createdAt).toLocaleDateString(
                        'en-US',
                        {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        }
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={showKey ? apiKey : maskedKey}
                    className="font-mono"
                  />

                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>

                  <Button variant="outline" size="icon" onClick={handleCopy}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(trackerScript)
                      toast.success('Tracker script copied to clipboard')
                    }}
                  >
                    <Copy className="h-4 w-4" />
                    Copy script
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </ProjectPanel>
      </div>
    </ProjectPageLayout>
  )
}

function ProjectMetricSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-4">
      <Skeleton className="size-9 rounded-lg" />
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-12" />
      </div>
    </div>
  )
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
