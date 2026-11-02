import { useResumeProject } from '@/mutations/projects'
import { getProjectsOptions } from '@/queries/projects'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@workspace/ui/components/button'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'

export const ProjectPaused = ({
  workspaceId,
  projectId,
}: {
  workspaceId: string
  projectId: string
}) => {
  const { data } = useQuery({
    ...getProjectsOptions({
      workspace_id: workspaceId,
      project_id: projectId,
    }),
  })
  const { mutate: resumeProject, isPending: resumeProjectPending } =
    useResumeProject(projectId)

  const project = data?.data?.[0]

  if (!project?.paused) return null

  return (
    <div className="relative border p-2">
      {/* Gradient border */}
      <div
        className="pointer-events-none absolute -inset-px"
        style={{
          background: `linear-gradient(225deg,
  var(--color-yellow-400) 0%,
  var(--color-yellow-400) 12%,
  transparent 65%
)`,
          padding: '1px',
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Project Paused</p>

          <p className="text-muted-foreground text-sm">
            Your project is currently paused. Resume tracking to start
            collecting new activity. Your existing analytics remain accessible.
          </p>
        </div>

        <Button
          onClick={() => resumeProject()}
          className="w-full"
          variant="outline"
        >
          <LoadingSwap isLoading={resumeProjectPending}>
            Resume Project
          </LoadingSwap>
        </Button>
      </div>
    </div>
  )
}
