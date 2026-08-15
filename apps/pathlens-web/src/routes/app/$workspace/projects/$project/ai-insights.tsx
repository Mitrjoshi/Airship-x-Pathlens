import {
  ProjectMetric,
  ProjectMetricStrip,
  ProjectPageHeader,
  ProjectPageLayout,
  ProjectPanel,
  PageToolbar,
} from '@/components/common/project-page'
import { PlanGate } from '@/components/common/plan-gate'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react'

import { CardContent } from '@workspace/ui/components/card'
import { Button } from '@workspace/ui/components/button'
import { Badge } from '@workspace/ui/components/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { cn } from '@workspace/ui/lib/utils'

export const Route = createFileRoute(
  '/app/$workspace/projects/$project/ai-insights'
)({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'AI Insights',
  },
})

type InsightType = 'trend' | 'anomaly' | 'opportunity'

interface Insight {
  id: string
  type: InsightType
  title: string
  description: string
  project: string
  timestamp: string
  impact: 'High' | 'Medium' | 'Low'
}

const insights: Insight[] = [
  {
    id: 'i_1',
    type: 'anomaly',
    title: 'Unusual traffic spike detected',
    description:
      'Marketing Site saw a 340% increase in visitors from 2–4 PM, primarily from a single referrer. Likely a Hacker News or Reddit mention worth investigating.',
    project: 'Marketing Site',
    timestamp: '2 hours ago',
    impact: 'High',
  },
  {
    id: 'i_2',
    type: 'trend',
    title: 'Bounce rate improving on pricing page',
    description:
      'Bounce rate on /pricing dropped from 52% to 38% over the last 2 weeks, coinciding with the new comparison table layout you shipped.',
    project: 'Marketing Site',
    timestamp: '6 hours ago',
    impact: 'Medium',
  },
  {
    id: 'i_3',
    type: 'opportunity',
    title: 'Mobile checkout drop-off is high',
    description:
      '68% of mobile visitors abandon checkout at the payment step, compared to 22% on desktop. Consider simplifying the mobile payment form.',
    project: 'App Dashboard',
    timestamp: '1 day ago',
    impact: 'High',
  },
  {
    id: 'i_4',
    type: 'trend',
    title: 'Docs search usage up 41%',
    description:
      'Visitors are using in-app docs search significantly more this month, especially for "API keys" and "webhooks" — consider surfacing these as quick links.',
    project: 'Docs',
    timestamp: '1 day ago',
    impact: 'Low',
  },
  {
    id: 'i_5',
    type: 'anomaly',
    title: 'Sudden drop in signups from LinkedIn',
    description:
      "LinkedIn referral signups fell 76% compared to last week's average, while other channels stayed flat. Worth checking if a campaign ended.",
    project: 'Marketing Site',
    timestamp: '2 days ago',
    impact: 'Medium',
  },
  {
    id: 'i_6',
    type: 'opportunity',
    title: 'Returning visitors convert 3x better',
    description:
      'Returning visitors on App Dashboard convert to paid plans at 3x the rate of new visitors. A retargeting email sequence could capture more of this.',
    project: 'App Dashboard',
    timestamp: '3 days ago',
    impact: 'Medium',
  },
]

function insightMeta(type: InsightType) {
  if (type === 'anomaly')
    return {
      icon: AlertTriangle,
      label: 'Anomaly',
      className: 'bg-red-500/15 text-red-600 hover:bg-red-500/15',
    }
  if (type === 'opportunity')
    return {
      icon: Lightbulb,
      label: 'Opportunity',
      className: 'bg-amber-500/15 text-amber-600 hover:bg-amber-500/15',
    }
  return {
    icon: TrendingUp,
    label: 'Trend',
    className: 'bg-blue-500/15 text-blue-600 hover:bg-blue-500/15',
  }
}

function impactClass(impact: Insight['impact']) {
  if (impact === 'High') return 'border-destructive/50'
  if (impact === 'Medium') return 'border-amber-500/50'
  return ''
}

function RouteComponent() {
  const { workspace } = Route.useParams()

  return (
    <PlanGate workspaceId={workspace} feature="aiInsights">
      <PageContent />
    </PlanGate>
  )
}

function PageContent() {
  const [typeFilter, setTypeFilter] = useState('all')
  const [isRefreshing, setIsRefreshing] = useState(false)

  const filteredInsights =
    typeFilter === 'all'
      ? insights
      : insights.filter((i) => i.type === typeFilter)

  const refresh = async () => {
    setIsRefreshing(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  return (
    <ProjectPageLayout>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Intelligence"
          title="AI Insights"
          description="Automatically generated observations across your projects."
          actions={
            <Button variant="outline" onClick={refresh} disabled={isRefreshing}>
              <RefreshCw
                className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')}
              />
              Refresh
            </Button>
          }
        />

        <PageToolbar className="justify-end">
          <Select
            value={typeFilter}
            onValueChange={(value) => {
              if (value) setTypeFilter(value)
            }}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Insights</SelectItem>
              <SelectItem value="trend">Trends</SelectItem>
              <SelectItem value="anomaly">Anomalies</SelectItem>
              <SelectItem value="opportunity">Opportunities</SelectItem>
            </SelectContent>
          </Select>
        </PageToolbar>

        {/* Summary */}
        <ProjectMetricStrip className="lg:grid-cols-3">
          <ProjectMetric
            label="Anomalies"
            value={insights.filter((i) => i.type === 'anomaly').length}
            icon={AlertTriangle}
          />
          <ProjectMetric
            label="Trends"
            value={insights.filter((i) => i.type === 'trend').length}
            icon={TrendingUp}
          />
          <ProjectMetric
            label="Opportunities"
            value={insights.filter((i) => i.type === 'opportunity').length}
            icon={Lightbulb}
          />
        </ProjectMetricStrip>

        {/* Insights List */}
        <div className="space-y-4">
          {filteredInsights.map((insight) => {
            const meta = insightMeta(insight.type)
            const Icon = meta.icon

            return (
              <ProjectPanel
                key={insight.id}
                className={cn('border-l-4', impactClass(insight.impact))}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-muted rounded-md p-2">
                        <Icon className="text-muted-foreground h-4 w-4" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{insight.title}</h3>
                          <Badge className={meta.className}>{meta.label}</Badge>
                          <Badge variant="outline">
                            {insight.impact} impact
                          </Badge>
                        </div>

                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {insight.description}
                        </p>

                        <div className="text-muted-foreground flex items-center gap-2 text-xs">
                          <span>{insight.project}</span>
                          <span>·</span>
                          <span>{insight.timestamp}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ThumbsUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </ProjectPanel>
            )
          })}
        </div>

        {filteredInsights.length === 0 && (
          <ProjectPanel>
            <CardContent className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Sparkles className="text-muted-foreground h-8 w-8" />
              <p className="font-medium">No insights yet</p>
              <p className="text-muted-foreground text-sm">
                Install the tracking script to start generating AI insights.
              </p>
            </CardContent>
          </ProjectPanel>
        )}
      </div>
    </ProjectPageLayout>
  )
}
