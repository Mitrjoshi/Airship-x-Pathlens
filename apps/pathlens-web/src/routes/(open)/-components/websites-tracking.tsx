import { formatNumber } from '@/utils/utils'
import { DotMatrixText } from './dot-matrix-text'
import { useQuery } from '@tanstack/react-query'
import { getActiveProjectDomainsCountOptions } from '@/queries/projects'

export const WebsitesTracking = () => {
  const { data, isLoading } = useQuery(getActiveProjectDomainsCountOptions())

  const activeProjects = data?.data?.count

  return (
    <div className="grid grid-cols-2 items-center divide-x-2 divide-dashed">
      <div className="nut-top-right flex h-full flex-col justify-center pl-10">
        <p className="text-4xl font-medium">Websites Tracked</p>
        <p className="text-muted-foreground mt-4 max-w-sm">
          Pathlens helps websites understand their visitors through powerful,
          real-time analytics. Every website tracked represents a growing
          community of businesses turning visitor activity into meaningful
          insights. See how our network continues to grow, one website at a
          time.
        </p>
      </div>

      <div className="nut-bottom-left">
        <DotMatrixText
          value={isLoading ? '' : formatNumber(activeProjects)}
          className="w-full"
        />
      </div>
    </div>
  )
}
