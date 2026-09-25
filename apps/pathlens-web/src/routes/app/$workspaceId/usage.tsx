import { getProjectsOptions } from '@/queries/projects'
import { getUsageOptions } from '@/queries/usage'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { z } from 'zod'

export const Route = createFileRoute('/app/$workspaceId/usage')({
  component: RouteComponent,
  validateSearch: z.object({ project_id: z.string().optional() }),
})

const items = [
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
  { label: 'System', value: 'system' },
]

function RouteComponent() {
  const { workspaceId } = Route.useParams()
  const { project_id: projectId } = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: projects } = useQuery(
    getProjectsOptions({
      workspace_id: workspaceId,
    })
  )

  const { data, isPending, isError } = useQuery(
    getUsageOptions(workspaceId, projectId)
  )

  console.log({ data })

  return (
    <div>
      <div className="mx-auto max-w-4xl p-5 pt-10">
        <div className="space-y-5">
          <p className="text-2xl font-medium">Usage</p>

          <Select
            value={projectId ?? 'All Projects'}
            onValueChange={(value) =>
              navigate({
                search: {
                  project_id: value === 'All Projects' ? undefined : value,
                },
              })
            }
            items={items}
          >
            <SelectTrigger className="w-50">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              {projects?.data.map((item) => (
                <SelectItem key={item.name} value={item.id}>
                  {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-muted-foreground text-sm">
            Lifetime account access is active.
          </p>
        </div>
      </div>
    </div>
  )
}
