import {
  Activity,
  BarChart3,
  Brain,
  Crosshair,
  Eye,
  FileBarChart,
  Gauge,
  Globe2,
  KeyRound,
  MousePointerClick,
  Play,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  UsersRound,
} from 'lucide-react'

const colors = {
  emerald: { hex: '#10B981', hue: 160 },
  teal: { hex: '#0D9488', hue: 174 },
  cyan: { hex: '#06B6D4', hue: 189 },
  blue: { hex: '#3B82F6', hue: 217 },
  indigo: { hex: '#6366F1', hue: 239 },
  violet: { hex: '#8B5CF6', hue: 258 },
  slate: { hex: '#64748B', hue: 215 },
  amber: { hex: '#F59E0B', hue: 38 },
  orange: { hex: '#F97316', hue: 25 },
  red: { hex: '#EF4444', hue: 0 },
}

export type ProductSection = (typeof productSections)[number]

type ProductItem = ProductSection['items'][number]

type ProductPage = ProductItem['page']

type AllPageKeys = ProductPage extends infer Page
  ? Page extends unknown
    ? keyof Page
    : never
  : never

type DynamicProductPage = {
  [K in AllPageKeys]?: ProductPage extends infer Page
    ? Page extends Record<K, infer Value>
      ? Value
      : never
    : never
}

export type ProductData = Omit<ProductItem, 'page'> & {
  page: DynamicProductPage
}

export const productSections = [
  {
    title: 'Analytics',
    items: [
      {
        title: 'Web Analytics',
        color: colors.blue,
        description: 'Understand traffic, engagement and conversions',
        icon: BarChart3,
        href: '/product/web-analytics',

        page: {
          eyebrow: 'Web Analytics',

          hero: {
            title: 'Understand what is happening across your website',
            description:
              'See visitors, sessions, page views, engagement, traffic sources and conversions in one clear view.',
            primaryAction: 'Start tracking',
            secondaryAction: 'Explore analytics',
            visual: 'analytics-dashboard',
          },

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Turn website activity into clear insights',
            description:
              'Pathlens brings your website data together so you can understand where visitors come from, what they do and what drives conversions.',
            steps: [
              {
                number: '01',
                title: 'Collect',
                description:
                  'Capture visitors, sessions, page views, traffic sources and interactions across your website.',
              },
              {
                number: '02',
                title: 'Analyze',
                description:
                  'Explore engagement, user journeys, devices, pages and other signals to understand how people use your site.',
              },
              {
                number: '03',
                title: 'Optimize',
                description:
                  'Spot drop-offs, identify high-performing pages and use real user behavior to improve your website.',
              },
            ],
            visual: 'analytics-how-it-works',
          },
        },
      },

      {
        title: 'Visitors',
        color: colors.teal,
        description: 'Explore anonymous visitors and their activity',
        icon: Users,
        href: '/product/visitors',

        page: {
          eyebrow: 'Visitors',

          hero: {
            title: 'Understand the people behind your traffic',
            description:
              'Move beyond aggregate numbers and explore anonymous visitor activity across sessions, pages and devices.',
            primaryAction: 'Explore visitors',
            secondaryAction: 'View analytics',
            visual: 'visitor-directory',
          },
        },
      },

      {
        title: 'Events',
        color: colors.cyan,
        description: 'See every meaningful action happening on your website',
        icon: Activity,
        href: '/product/events',

        page: {
          eyebrow: 'Events',

          hero: {
            title: 'See what visitors actually do',
            description:
              'Follow meaningful visitor actions and technical signals with the page, session and device context around them.',
            primaryAction: 'Explore events',
            secondaryAction: 'View session replay',
            visual: 'event-stream',
          },
        },
      },

      {
        title: 'Funnels',
        color: colors.violet,
        description: 'See where users progress, convert or drop off',
        icon: TrendingUp,
        href: '/product/funnels',

        page: {
          eyebrow: 'Funnels',

          hero: {
            title: 'Find where important journeys lose momentum',
            description:
              'Build ordered journeys and see exactly where visitors continue, convert or drop off.',
            primaryAction: 'Build a funnel',
            secondaryAction: 'Explore conversions',
            visual: 'funnel-chart',
          },
        },
      },

      {
        title: 'Goals',
        color: colors.amber,
        description: 'Turn important business outcomes into measurable targets',
        icon: Target,
        href: '/product/goals',

        page: {
          eyebrow: 'Goals',

          hero: {
            title: 'Measure the outcomes that matter to your business',
            description:
              'Turn important events, pages, forms, buttons and revenue outcomes into clear measurable goals.',
            primaryAction: 'Create a goal',
            secondaryAction: 'Explore conversions',
            visual: 'goal-dashboard',
          },
        },
      },
    ],
  },

  {
    title: 'Behavior',
    items: [
      {
        title: 'Session Replay',
        color: colors.indigo,
        description: 'Watch how real visitors experience your website',
        icon: Play,
        href: '/product/session-replay',

        page: {
          eyebrow: 'Session Replay',

          hero: {
            title: 'Watch the experience behind the numbers',
            description:
              'Replay real visitor sessions to understand confusion, navigation, friction, errors and conversion behavior.',
            primaryAction: 'Explore replay',
            secondaryAction: 'View events',
            visual: 'session-player',
          },
        },
      },

      {
        title: 'Heatmaps',
        color: colors.orange,
        description: 'See where visitors click and how far they scroll',
        icon: Crosshair,
        href: '/product/heatmaps',

        page: {
          eyebrow: 'Heatmaps',

          hero: {
            title: 'See how visitors experience every page',
            description:
              'Turn clicks and scrolling into a visual layer that reveals attention, interaction and drop-off.',
            primaryAction: 'Explore heatmaps',
            secondaryAction: 'View session replay',
            visual: 'heatmap-preview',
          },

          highlights: [
            {
              value: 'Clicks',
              label: 'Interaction intensity',
            },
            {
              value: 'Scroll',
              label: 'Content reach',
            },
            {
              value: 'Pages',
              label: 'Page-level analysis',
            },
          ],

          sections: [
            {
              eyebrow: 'Click maps',
              title: 'See what gets attention',
              description:
                'Visualize where visitors click and which areas receive the strongest interaction.',
              points: [
                'Click intensity',
                'Grouped click regions',
                'Ranked activity areas',
                'Click coordinates',
                'Click totals',
                'Intensity comparison',
              ],
              visual: 'click-heatmap',
            },

            {
              eyebrow: 'Scroll maps',
              title: 'See how far visitors actually read',
              description:
                'Understand how engagement changes as visitors move from the top of a page toward the bottom.',
              points: [
                'Scroll-depth bands',
                'Average reached percentage',
                'Top-to-bottom scale',
                'Attention decline',
              ],
              visual: 'scroll-heatmap',
            },

            {
              eyebrow: 'Page selection',
              title: 'Analyze the pages that matter most',
              description:
                'Choose pages based on captured activity and compare the behavior happening on each.',
              points: [
                'Page views',
                'Clicks',
                'Scroll events',
                'Maximum scroll depth',
                'Date filtering',
              ],
              visual: 'heatmap-page-selector',
            },
          ],

          cta: {
            title: 'See your website through visitor behavior',
            description:
              'Turn interaction data into an intuitive visual experience.',
            action: 'Explore heatmaps',
          },
        },
      },

      {
        title: 'Click Analytics',
        color: colors.red,
        description: 'Understand which elements receive the most interaction',
        icon: MousePointerClick,
        href: '/product/click-analytics',

        page: {
          eyebrow: 'Click Analytics',

          hero: {
            title: 'Understand what visitors choose to interact with',
            description:
              'Analyze clicks with element, page, coordinate and visitor context to understand what attracts attention.',
            primaryAction: 'Explore clicks',
            secondaryAction: 'View heatmaps',
            visual: 'click-analysis',
          },

          highlights: [
            {
              value: 'Elements',
              label: 'Clicked controls',
            },
            {
              value: 'Position',
              label: 'Interaction coordinates',
            },
            {
              value: 'Context',
              label: 'Page and session data',
            },
          ],

          sections: [
            {
              eyebrow: 'Interactions',
              title: 'Know exactly what visitors clicked',
              description:
                'Pathlens captures useful context around click activity instead of showing an isolated click count.',
              points: [
                'Clicked element',
                'Visible text',
                'Button text',
                'Element name',
                'Coordinates',
                'Appearance information',
              ],
              visual: 'click-detail',
            },

            {
              eyebrow: 'Visual patterns',
              title: 'See where clicks concentrate',
              description:
                'Combine detailed click events with heatmap visualizations to understand high-activity areas.',
              points: [
                'Grouped regions',
                'Interaction intensity',
                'Ranked click areas',
                'Page preview',
              ],
              visual: 'click-regions',
            },

            {
              eyebrow: 'Context',
              title: 'Connect a click with the visitor journey',
              description:
                'Move from an interaction into its page, session and replay context.',
              points: [
                'Visitor context',
                'Session context',
                'Page context',
                'Replay availability',
              ],
              visual: 'click-context',
            },
          ],

          cta: {
            title: 'Understand every important click',
            description:
              'See not only what was clicked, but where and in what context.',
            action: 'Explore clicks',
          },
        },
      },

      {
        title: 'Visitor Activity',
        color: colors.emerald,
        description: 'Follow visitor behavior across sessions and pages',
        icon: Eye,
        href: '/product/visitor-activity',

        page: {
          eyebrow: 'Visitor Activity',

          hero: {
            title: 'Follow the journey behind each visitor',
            description:
              'Connect sessions, pages and events into a clearer picture of how an anonymous visitor experiences your website.',
            primaryAction: 'Explore activity',
            secondaryAction: 'View visitors',
            visual: 'visitor-timeline',
          },

          highlights: [
            {
              value: 'Sessions',
              label: 'Visits over time',
            },
            {
              value: 'Pages',
              label: 'Content explored',
            },
            {
              value: 'Events',
              label: 'Actions taken',
            },
          ],

          sections: [
            {
              eyebrow: 'Visitor context',
              title: 'Understand each visitor in context',
              description:
                'Combine visitor details with the sessions and activity associated with them.',
              points: [
                'Country',
                'Device',
                'Browser',
                'Session count',
                'Page views',
                'Duration',
                'Last activity',
              ],
              visual: 'visitor-profile',
            },

            {
              eyebrow: 'Activity timeline',
              title: 'Follow activity chronologically',
              description:
                'See how visitor actions unfold across pages and sessions.',
              points: [
                'Page navigation',
                'Clicks',
                'Forms',
                'Scrolls',
                'Session boundaries',
                'Custom events',
              ],
              visual: 'visitor-activity-timeline',
            },

            {
              eyebrow: 'Replay',
              title: 'Move from activity to visual evidence',
              description:
                'When replay is available, investigate the visitor experience directly instead of relying only on event rows.',
              points: [
                'Replay availability',
                'Session playback',
                'Event-linked navigation',
              ],
              visual: 'visitor-replay-link',
            },
          ],

          cta: {
            title: 'See the complete visitor story',
            description:
              'Connect anonymous visitor records with the behavior behind them.',
            action: 'Explore visitor activity',
          },
        },
      },
    ],
  },

  {
    title: 'Experience',
    items: [
      {
        title: 'Performance',
        color: colors.emerald,
        description: 'Measure page speed across pages, devices and browsers',
        icon: Gauge,
        href: '/product/performance',

        page: {
          eyebrow: 'Performance',

          hero: {
            title: 'See when website performance affects the experience',
            description:
              'Measure browser performance across pages, devices and browsers to find where slowdowns are concentrated.',
            primaryAction: 'Explore performance',
            secondaryAction: 'View analytics',
            visual: 'performance-dashboard',
          },

          highlights: [
            {
              value: 'TTFB',
              label: 'Server response',
            },
            {
              value: 'Load',
              label: 'Full page timing',
            },
            {
              value: 'P75',
              label: 'Performance distribution',
            },
          ],

          sections: [
            {
              eyebrow: 'Timing metrics',
              title: 'Understand how pages load',
              description:
                'Pathlens captures browser navigation timing signals that reveal where page-loading time is being spent.',
              points: [
                'DNS lookup time',
                'TCP connection time',
                'Time to first byte',
                'DOM content loaded time',
                'Full page-load time',
              ],
              visual: 'performance-metrics',
            },

            {
              eyebrow: 'Comparisons',
              title: 'Find where performance problems are concentrated',
              description:
                'Compare timing across pages, browsers and device categories instead of relying on a single average.',
              points: [
                'Page comparison',
                'Browser comparison',
                'Device comparison',
                'Sample counts',
                'Average values',
                '75th percentile',
              ],
              visual: 'performance-comparison',
            },

            {
              eyebrow: 'Trends',
              title: 'See how performance changes over time',
              description:
                'Monitor timing trends and narrow the results by date range or device.',
              points: [
                'Performance trends',
                'Date filters',
                'Device filters',
                'Sample volume',
              ],
              visual: 'performance-trends',
            },
          ],

          cta: {
            title: 'Connect speed with real user experience',
            description:
              'Understand where performance issues are affecting visitors.',
            action: 'Explore performance',
          },
        },
      },

      {
        title: 'Traffic Sources',
        color: colors.cyan,
        description: 'Understand where visitors discover your website',
        icon: Globe2,
        href: '/product/traffic-sources',

        page: {
          eyebrow: 'Traffic Sources',

          hero: {
            title: 'Know where your visitors come from',
            description:
              'Understand which referring sources, countries and audience segments contribute to your traffic.',
            primaryAction: 'Explore traffic',
            secondaryAction: 'View analytics',
            visual: 'traffic-sources-dashboard',
          },

          highlights: [
            {
              value: 'Sources',
              label: 'Visitor acquisition',
            },
            {
              value: 'Countries',
              label: 'Geographic distribution',
            },
            {
              value: 'Devices',
              label: 'Technology mix',
            },
          ],

          sections: [
            {
              eyebrow: 'Acquisition',
              title: 'See which sources drive visits',
              description:
                'Compare referring sources to understand where website traffic originates.',
              points: [
                'Top referrers',
                'Source contribution',
                'Traffic volume',
                'Session context',
              ],
              visual: 'source-breakdown',
            },

            {
              eyebrow: 'Geography',
              title: 'Understand where your audience is located',
              description:
                'Explore country and regional context around your visitors.',
              points: [
                'Country breakdown',
                'Visitor distribution',
                'Audience comparison',
              ],
              visual: 'geography-map',
            },

            {
              eyebrow: 'Technology',
              title: 'See how your audience accesses your website',
              description:
                'Compare traffic across device categories and browsers.',
              points: ['Desktop', 'Mobile', 'Tablet', 'Browser breakdown'],
              visual: 'device-browser-breakdown',
            },
          ],

          cta: {
            title: 'Understand your acquisition mix',
            description:
              'See where traffic originates and how those visitors access your website.',
            action: 'Explore traffic sources',
          },
        },
      },

      {
        title: 'Reports',
        color: colors.slate,
        description: 'Turn website performance into shareable reports',
        icon: FileBarChart,
        href: '/product/reports',

        page: {
          eyebrow: 'Reports',

          hero: {
            title: 'Turn analytics into something everyone can understand',
            description:
              'Create concise views of website traffic and audience performance for reviews, campaigns and stakeholders.',
            primaryAction: 'Explore reports',
            secondaryAction: 'View analytics',
            visual: 'report-preview',
          },

          highlights: [
            {
              value: 'Traffic',
              label: 'Core audience metrics',
            },
            {
              value: 'Breakdowns',
              label: 'Audience composition',
            },
            {
              value: 'CSV',
              label: 'Exportable data',
            },
          ],

          sections: [
            {
              eyebrow: 'Reporting',
              title: 'Keep important metrics together',
              description:
                'Reports combine the website metrics and breakdowns teams commonly need for reviews and campaign analysis.',
              points: [
                'Visitors',
                'Sessions',
                'Bounce rate',
                'Average session duration',
                'Traffic trends',
                'Device mix',
                'Top referrers',
                'Countries',
                'Browsers',
              ],
              visual: 'report-dashboard',
            },

            {
              eyebrow: 'Filters',
              title: 'Report on the right audience and period',
              description:
                'The current date and device filters remain part of the report context.',
              points: ['Date ranges', 'Device filters', 'Filtered summaries'],
              visual: 'report-filters',
            },

            {
              eyebrow: 'Export',
              title: 'Take analytics outside Pathlens when needed',
              description:
                'Export the current report to CSV while respecting workspace permissions.',
              points: [
                'CSV export',
                'Summary metrics',
                'Daily traffic',
                'Device mix',
                'Referrers',
                'Countries',
                'Browsers',
                'Permission-controlled export',
              ],
              visual: 'report-export',
            },
          ],

          cta: {
            title: 'Make analytics easier to share',
            description:
              'Turn website data into clear reporting for your team and stakeholders.',
            action: 'Explore reports',
          },
        },
      },
    ],
  },

  {
    title: 'Intelligence',
    items: [
      {
        title: 'AI Insights',
        color: colors.violet,
        description:
          'Discover trends, anomalies and opportunities automatically',
        icon: Brain,
        href: '/product/ai-insights',

        page: {
          eyebrow: 'AI Insights',

          hero: {
            title: 'Find the changes worth paying attention to',
            description:
              'Pathlens surfaces notable trends, anomalies and opportunities from your project activity.',
            primaryAction: 'Explore insights',
            secondaryAction: 'View analytics',
            visual: 'ai-insights-feed',
          },

          highlights: [
            {
              value: 'Trends',
              label: 'Meaningful movement',
            },
            {
              value: 'Anomalies',
              label: 'Unexpected changes',
            },
            {
              value: 'Opportunities',
              label: 'Areas worth exploring',
            },
          ],

          sections: [
            {
              eyebrow: 'Automatic insights',
              title: 'Surface signals without searching every dashboard',
              description:
                'Pathlens organizes observations into focused insight categories so teams can quickly identify noteworthy activity.',
              points: [
                'Trends',
                'Anomalies',
                'Opportunities',
                'Category filtering',
                'Summary counts',
              ],
              visual: 'insight-categories',
            },

            {
              eyebrow: 'Context',
              title: 'Understand why an insight matters',
              description:
                'Each insight includes enough context to help teams decide whether it deserves deeper investigation.',
              points: [
                'Insight title',
                'Explanation',
                'Project context',
                'Observation time',
                'Impact level',
              ],
              visual: 'insight-card',
            },

            {
              eyebrow: 'Feedback',
              title: 'Tell Pathlens which insights are useful',
              description:
                'Users can provide positive or negative feedback on generated insights.',
              points: [
                'Positive feedback',
                'Negative feedback',
                'High impact',
                'Medium impact',
                'Low impact',
              ],
              visual: 'insight-feedback',
            },
          ],

          cta: {
            title: 'Spend less time searching for changes',
            description:
              'Let Pathlens surface important signals from your website activity.',
            action: 'Explore AI insights',
          },
        },
      },
    ],
  },

  {
    title: 'Platform',
    items: [
      {
        title: 'Privacy',
        color: colors.slate,
        description: 'Understand behavior without identifying visitors by name',
        icon: ShieldCheck,
        href: '/product/privacy',

        page: {
          eyebrow: 'Privacy',

          hero: {
            title:
              'Behavioral analytics with privacy built into the experience',
            description:
              'Understand website behavior using anonymous visitor identifiers and controls for sensitive replay content.',
            primaryAction: 'Explore privacy',
            secondaryAction: 'View session replay',
            visual: 'privacy-controls',
          },

          highlights: [
            {
              value: 'Anonymous',
              label: 'Visitor identification',
            },
            {
              value: 'Masked',
              label: 'Sensitive inputs',
            },
            {
              value: 'Blocked',
              label: 'Selected elements',
            },
          ],

          sections: [
            {
              eyebrow: 'Anonymous visitors',
              title: 'Understand behavior without requiring visitor names',
              description:
                'Pathlens represents visitors through anonymous identifiers while retaining the context required for useful analytics.',
              points: [
                'Anonymous identifiers',
                'Session context',
                'Device context',
                'Browser context',
                'Location context',
                'Page activity',
              ],
              visual: 'anonymous-visitor',
            },

            {
              eyebrow: 'Replay privacy',
              title: 'Control what recordings can contain',
              description:
                'Sensitive website content can be masked or blocked from session replay.',
              points: [
                'Input masking',
                'Text masking',
                'Blocked elements',
                'Password exclusion',
              ],
              visual: 'privacy-masking',
            },

            {
              eyebrow: 'Control',
              title: 'Keep analytics useful without collecting everything',
              description:
                'Pathlens is designed to preserve meaningful behavioral context while limiting unnecessary sensitive information.',
              points: [
                'Privacy-conscious collection',
                'Replay controls',
                'Anonymous visitor context',
              ],
              visual: 'privacy-overview',
            },
          ],

          cta: {
            title: 'Understand behavior with privacy in mind',
            description:
              'Capture useful product context without requiring personally named visitors.',
            action: 'Explore Pathlens',
          },
        },
      },

      {
        title: 'Workspaces',
        color: colors.emerald,
        description: 'Organize websites, projects and teams in one place',
        icon: UsersRound,
        href: '/product/workspaces',

        page: {
          eyebrow: 'Workspaces',

          hero: {
            title: 'Keep every website and team organized',
            description:
              'Use workspaces and projects to manage analytics across multiple websites without mixing data or access.',
            primaryAction: 'Create a workspace',
            secondaryAction: 'Explore projects',
            visual: 'workspace-dashboard',
          },

          highlights: [
            {
              value: 'Workspaces',
              label: 'Team areas',
            },
            {
              value: 'Projects',
              label: 'Websites measured',
            },
            {
              value: 'Members',
              label: 'Team collaboration',
            },
          ],

          sections: [
            {
              eyebrow: 'Organization',
              title: 'A clear home for every project',
              description:
                'Workspaces organize teams while projects represent individual websites or products being measured.',
              points: [
                'Multiple workspaces',
                'Multiple projects',
                'Workspace switching',
                'Project switching',
                'Default workspace',
                'Project counts',
                'Member counts',
              ],
              visual: 'workspace-projects',
            },

            {
              eyebrow: 'Team',
              title: 'Bring teammates into the right workspace',
              description:
                'Workspace administrators can manage members and invitations from one place.',
              points: [
                'Active members',
                'Pending invitations',
                'Email invitations',
                'Access profiles',
                'Role changes',
                'Member removal',
              ],
              visual: 'workspace-members',
            },

            {
              eyebrow: 'Projects',
              title: 'Keep analytics separated by website',
              description:
                'Each project contains its own analytics, visitors, events, replay, heatmaps, funnels, goals and reports.',
              points: [
                'Website address',
                'Project status',
                'Visitors',
                'Sessions',
                'Events',
                'Conversion rate',
              ],
              visual: 'project-list',
            },
          ],

          cta: {
            title: 'Organize analytics around your team',
            description:
              'Keep websites, projects and teammates together without losing control.',
            action: 'Create a workspace',
          },
        },
      },

      {
        title: 'Access Control',
        color: colors.blue,
        description: 'Control what teammates can view and manage',
        icon: KeyRound,
        href: '/product/access-control',

        page: {
          eyebrow: 'Access Control',

          hero: {
            title: 'Give every teammate the right level of access',
            description:
              'Use reusable permission profiles to control what people can see, change and export within a workspace.',
            primaryAction: 'Explore permissions',
            secondaryAction: 'View workspaces',
            visual: 'permission-matrix',
          },

          highlights: [
            {
              value: 'Profiles',
              label: 'Reusable permissions',
            },
            {
              value: 'Members',
              label: 'Role assignment',
            },
            {
              value: 'Control',
              label: 'Workspace visibility',
            },
          ],

          sections: [
            {
              eyebrow: 'Permission profiles',
              title: 'Define access once and reuse it',
              description:
                'Create permission profiles containing the access rules required for different types of teammates.',
              points: [
                'Create profiles',
                'Edit profiles',
                'Duplicate profiles',
                'Individual permissions',
                'Permission groups',
                'Built-in profiles',
              ],
              visual: 'permission-profile-builder',
            },

            {
              eyebrow: 'Granular access',
              title: 'Control access across the Pathlens workspace',
              description:
                'Permissions can cover workspace administration, projects and individual analytics areas.',
              points: [
                'Workspace settings',
                'Members',
                'Projects',
                'Tracking keys',
                'Analytics',
                'Visitors',
                'Events',
                'Session replay',
                'Funnels',
                'Goals',
                'Reports',
                'AI insights',
              ],
              visual: 'permission-matrix',
            },

            {
              eyebrow: 'Member management',
              title: 'Assign the right access to every teammate',
              description:
                'Apply permission profiles when inviting teammates or managing existing workspace members.',
              points: [
                'Profile assignment',
                'Pending invitations',
                'Role changes',
                'Protected workspace owner',
                'Permission-aware navigation',
              ],
              visual: 'member-access',
            },
          ],

          cta: {
            title: 'Keep access simple as your team grows',
            description:
              'Give people the tools they need without opening everything.',
            action: 'Explore access control',
          },
        },
      },
    ],
  },
]
