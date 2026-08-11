import type { T_Projects } from '@/queries/projects'
import { Card, CardContent } from '@workspace/ui/components/card'
import { Link } from '@tanstack/react-router'
import { ArrowUpRightIcon, GlobeIcon } from 'lucide-react'
import { navigationIcons } from '@/config/navigation-icons'
import { formatNumber } from '@/utils/utils'

interface I_Props {
  project: T_Projects
  workspace: string
}

export const ProjectCard = ({ project, workspace }: I_Props) => {
  const isActive = project.stats.status === 'active'

  return (
    <Link
      to="/app/$workspace/projects/$project/dashboard"
      params={{
        project: String(project.id),
        workspace,
      }}
      className="group focus-visible:ring-ring/50 block rounded-xl outline-none focus-visible:ring-3"
    >
      <Card className="group-hover:border-foreground/30 group-hover:bg-muted/20 py-0 transition-colors">
        <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-5 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(18rem,auto)_auto] sm:items-center sm:p-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`size-2 shrink-0 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`}
              />
              <h2 className="truncate text-sm font-medium">{project.name}</h2>
              <span
                className={`text-[11px] ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}
              >
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-muted-foreground mt-2 flex items-center gap-1.5 truncate text-xs">
              <GlobeIcon className="size-3.5 shrink-0" />
              {project.domain ?? 'No domain connected'}
            </p>
          </div>

          <div className="col-span-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:col-span-1 sm:grid-cols-4 sm:gap-x-5">
            <ProjectMetric
              label="Visitors"
              value={formatNumber(project.stats.visitors || 0)}
              icon={navigationIcons.visitors}
            />
            <ProjectMetric
              label="Sessions"
              value={formatNumber(project.stats.sessions || 0)}
              icon={navigationIcons.sessions}
            />
            <ProjectMetric
              label="Events"
              value={formatNumber(project.stats.events || 0)}
              icon={navigationIcons.events}
            />
            <ProjectMetric
              label="Conversion"
              value={`${project.stats.conversion || 0}%`}
            />
          </div>

          <ArrowUpRightIcon className="text-muted-foreground col-start-2 row-start-1 size-4 justify-self-end transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:col-auto sm:row-auto sm:justify-self-auto" />
        </CardContent>
      </Card>
    </Link>
  )
}

function ProjectMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon?: React.ElementType
}) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground flex items-center gap-1 text-[11px]">
        {Icon && <Icon className="size-3" />}
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-1 text-sm font-medium tabular-nums">{value}</p>
    </div>
  )
}
