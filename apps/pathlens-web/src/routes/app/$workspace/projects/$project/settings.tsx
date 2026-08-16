import {
  ProjectPageHeader,
  ProjectPageLayout,
  ProjectPanel,
} from '@/components/common/project-page'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { Separator } from '@workspace/ui/components/separator'
import { Switch } from '@workspace/ui/components/switch'
import { Textarea } from '@workspace/ui/components/textarea'
import { useDeleteProject } from '@/mutations/projects'
import { getProjectsOptions } from '@/queries/projects'
import { getWorkspacesOptions } from '@/queries/workspace'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/settings'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { workspace, project } = Route.useParams()

  const { data } = useQuery(
    getProjectsOptions({
      workspace_id: workspace,
      project_id: project,
    })
  )
  const { data: workspaceData } = useQuery(getWorkspacesOptions())

  const { mutate: deleteMutate, isPending: deletePending } = useDeleteProject()

  const projectData = data?.data[0]
  const currentWorkspace = workspaceData?.data.find(
    (item) => item.id === workspace
  )
  const canDeleteProject =
    currentWorkspace?.role === 'owner' ||
    currentWorkspace?.permissions.includes('projects.delete')

  return (
    <ProjectPageLayout>
      <div className="mx-auto w-full space-y-8">
        <ProjectPageHeader
          eyebrow="Configuration"
          title="Project settings"
          description="Manage your project configuration and tracking preferences."
        />

        {/* General */}
        <ProjectPanel
          key={`tracking-${projectData?.id ?? 'loading'}-${projectData?.captureReplay ?? true}-${projectData?.capturePerformance ?? true}-${projectData?.captureErrors ?? false}`}
        >
          <CardHeader className="border-b px-5 py-5">
            <CardTitle>General</CardTitle>
            <CardDescription>
              Basic information about your project.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input defaultValue={projectData?.name} />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div>
                  <Badge>Active</Badge>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                defaultValue={projectData?.description ?? undefined}
              />
            </div>
          </CardContent>
        </ProjectPanel>

        {/* Tracking */}
        <ProjectPanel>
          <CardHeader className="border-b px-5 py-5">
            <CardTitle>Tracking</CardTitle>
            <CardDescription>
              Configure what events are collected.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Session Replay</p>
                <p className="text-muted-foreground text-sm">
                  Record user sessions.
                </p>
              </div>

              <Switch defaultChecked={projectData?.captureReplay ?? true} />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Performance Metrics</p>
                <p className="text-muted-foreground text-sm">
                  Capture Core Web Vitals and page performance.
                </p>
              </div>

              <Switch
                defaultChecked={projectData?.capturePerformance ?? true}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Error Tracking</p>
                <p className="text-muted-foreground text-sm">
                  Record uncaught JavaScript errors.
                </p>
              </div>

              <Switch defaultChecked={projectData?.captureErrors ?? false} />
            </div>
          </CardContent>
        </ProjectPanel>

        {/* Domain */}
        <ProjectPanel>
          <CardHeader className="border-b px-5 py-5">
            <CardTitle>Domains</CardTitle>
            <CardDescription>
              Allowed domains where the tracker can run.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 p-5">
            <Input defaultValue={projectData?.domain ?? ''} />
            <Input defaultValue="http://localhost:5173" />
            <Button variant="outline">Add Domain</Button>
          </CardContent>
        </ProjectPanel>

        {/* API */}
        <ProjectPanel>
          <CardHeader className="border-b px-5 py-5">
            <CardTitle>API</CardTitle>
            <CardDescription>Public project credentials.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 p-5">
            <div className="space-y-2">
              <Label>Project ID</Label>
              <Input readOnly value={projectData?.id ?? ''} />
            </div>

            <div className="space-y-2">
              <Label>Public API Key</Label>
              <Input readOnly value={projectData?.apiKey ?? ''} />
            </div>
          </CardContent>
        </ProjectPanel>

        {/* Danger Zone */}
        <ProjectPanel className="border-destructive">
          <CardHeader className="border-b px-5 py-5">
            <CardTitle>Danger Zone</CardTitle>
            <CardDescription>These actions cannot be undone.</CardDescription>
          </CardHeader>

          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="font-medium">Delete Project</p>
              <p className="text-muted-foreground text-sm">
                Permanently delete this project and all collected analytics.
              </p>
            </div>

            <Button
              onClick={() => {
                deleteMutate({
                  project_id: project,
                  workspace_id: workspace,
                })
              }}
              variant="destructive"
              disabled={deletePending || !canDeleteProject}
            >
              <LoadingSwap isLoading={deletePending}>
                Delete Project
              </LoadingSwap>
            </Button>
          </CardContent>
        </ProjectPanel>

        <div className="flex justify-end gap-2">
          <Button variant="outline">Cancel</Button>
          <Button>Save Changes</Button>
        </div>
      </div>
    </ProjectPageLayout>
  )
}
