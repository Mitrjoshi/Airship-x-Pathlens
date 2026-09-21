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
  slate: { hex: '#A78BFA', hue: 215 },
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

          workflow: {
            title: 'Understand your website performance',
            description:
              'See how people discover, navigate and engage with your website, with clear insights into traffic, sessions, pages, sources and conversions.',
            nodes: [
              /* ------------------------------------------------------------------ */
              /* VISITORS                                                          */
              /* ------------------------------------------------------------------ */

              {
                id: 'visitor-1',
                type: 'icon',
                position: {
                  x: 30,
                  y: 180,
                },
                label: 'Visitor',
                color: 'orange',
                icon: 'user',
              },

              {
                id: 'visitor-2',
                type: 'icon',
                position: {
                  x: 120,
                  y: 180,
                },
                label: 'Visitor',
                color: 'orange',
                icon: 'user',
              },

              /* ------------------------------------------------------------------ */
              /* WEBSITE / COLLECTION                                              */
              /* ------------------------------------------------------------------ */

              {
                id: 'collection-group',
                type: 'group',
                position: {
                  x: 220,
                  y: 270,
                },
                label: 'Data Collection',
                color: 'cyan',
                width: 150,
                height: 100,
              },

              {
                id: 'website',
                type: 'icon',
                position: {
                  x: 12,
                  y: 24,
                },
                parentId: 'collection-group',
                color: 'cyan',
                icon: 'globe',
              },

              {
                id: 'tracking-script',
                type: 'icon',
                position: {
                  x: 78,
                  y: 24,
                },
                parentId: 'collection-group',
                color: 'cyan',
                icon: 'code',
              },

              /* ------------------------------------------------------------------ */
              /* EVENT PROCESSING                                                  */
              /* ------------------------------------------------------------------ */

              {
                id: 'processing-group',
                type: 'group',
                position: {
                  x: 440,
                  y: 250,
                },
                label: 'Event Processing',
                color: 'blue',
                width: 80,
                height: 170,
              },

              {
                id: 'pageviews',
                type: 'icon',
                position: {
                  x: 11,
                  y: 20,
                },
                parentId: 'processing-group',
                color: 'blue',
                icon: 'activity',
              },

              {
                id: 'sessions',
                type: 'icon',
                position: {
                  x: 11,
                  y: 92,
                },
                parentId: 'processing-group',
                color: 'blue',
                icon: 'activity',
              },

              /* ------------------------------------------------------------------ */
              /* ANALYTICS ENGINE                                                  */
              /* ------------------------------------------------------------------ */

              {
                id: 'analytics-group',
                type: 'group',
                position: {
                  x: 600,
                  y: 230,
                },
                label: 'Analytics Engine',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'traffic-analysis',
                type: 'icon',
                position: {
                  x: 11,
                  y: 20,
                },
                parentId: 'analytics-group',
                color: 'blue',
                icon: 'chart',
              },

              {
                id: 'journey-analysis',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'analytics-group',
                color: 'blue',
                icon: 'trend',
              },

              {
                id: 'conversion-analysis',
                type: 'icon',
                position: {
                  x: 11,
                  y: 144,
                },
                parentId: 'analytics-group',
                color: 'blue',
                icon: 'target',
              },

              /* ------------------------------------------------------------------ */
              /* DATA & STORAGE                                                    */
              /* ------------------------------------------------------------------ */

              {
                id: 'storage-group',
                type: 'group',
                position: {
                  x: 760,
                  y: 250,
                },
                label: 'Data & Storage',
                color: 'pink',
                width: 80,
                height: 170,
              },

              {
                id: 'analytics-database',
                type: 'icon',
                position: {
                  x: 11,
                  y: 20,
                },
                parentId: 'storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'event-storage',
                type: 'icon',
                position: {
                  x: 11,
                  y: 92,
                },
                parentId: 'storage-group',
                color: 'pink',
                icon: 'folder',
              },

              /* ------------------------------------------------------------------ */
              /* DASHBOARD                                                         */
              /* ------------------------------------------------------------------ */

              {
                id: 'insights',
                type: 'icon',
                position: {
                  x: 920,
                  y: 305,
                },
                label: 'Insights',
                color: 'blue',
                icon: 'chart',
              },

              {
                id: 'dashboard',
                type: 'browser',
                position: {
                  x: 1040,
                  y: 230,
                },
              },
            ],

            connections: [
              /* Visitors -> Website */

              {
                source: 'visitor-1',
                target: 'website',
              },

              {
                source: 'visitor-2',
                target: 'website',
              },

              /* Website -> Tracking */

              {
                source: 'website',
                target: 'tracking-script',
              },

              /* Tracking -> Events */

              {
                source: 'tracking-script',
                target: 'pageviews',
              },

              {
                source: 'tracking-script',
                target: 'sessions',
              },

              /* Events -> Analytics */

              {
                source: 'pageviews',
                target: 'traffic-analysis',
              },

              {
                source: 'pageviews',
                target: 'journey-analysis',
              },

              {
                source: 'sessions',
                target: 'journey-analysis',
              },

              {
                source: 'sessions',
                target: 'conversion-analysis',
              },

              /* Analytics -> Storage */

              {
                source: 'traffic-analysis',
                target: 'analytics-database',
              },

              {
                source: 'journey-analysis',
                target: 'analytics-database',
              },

              {
                source: 'conversion-analysis',
                target: 'event-storage',
              },

              /* Storage -> Insights */

              {
                source: 'analytics-database',
                target: 'insights',
              },

              {
                source: 'event-storage',
                target: 'insights',
              },

              /* Insights -> Dashboard */

              {
                source: 'insights',
                target: 'dashboard',
              },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'See every visitor journey in context',
            description:
              'Pathlens connects anonymous sessions, page views and interactions into clear visitor profiles so you can understand how individual people move through your website.',
            steps: [
              {
                number: '01',
                title: 'Identify',
                description:
                  'Assign anonymous visitors a persistent identity as they browse your website.',
              },
              {
                number: '02',
                title: 'Connect',
                description:
                  'Bring page views, sessions, referrers, devices and interactions together into one visitor timeline.',
              },
              {
                number: '03',
                title: 'Explore',
                description:
                  'Open individual visitor profiles to understand journeys, engagement and conversion activity.',
              },
            ],
            visual: 'visitors-how-it-works',
          },

          workflow: {
            title: 'Understand every visitor journey',
            description:
              'Explore anonymous visitor activity across sessions, pages and devices to see how individual users move through and engage with your website.',
            nodes: [
              /* ------------------------------------------------------------------ */
              /* VISITORS                                                          */
              /* ------------------------------------------------------------------ */

              {
                id: 'visitor-1',
                type: 'icon',
                position: {
                  x: 40,
                  y: 210,
                },
                label: 'Visitor A',
                color: 'orange',
                icon: 'user',
              },

              {
                id: 'visitor-2',
                type: 'icon',
                position: {
                  x: 125,
                  y: 210,
                },
                label: 'Visitor B',
                color: 'orange',
                icon: 'user',
              },

              /* ------------------------------------------------------------------ */
              /* TRACKING                                                          */
              /* ------------------------------------------------------------------ */

              {
                id: 'tracking-group',
                type: 'group',
                position: {
                  x: 230,
                  y: 275,
                },
                label: 'Visitor Tracking',
                color: colors.teal,
                width: 145,
                height: 100,
              },

              {
                id: 'visitor-id',
                type: 'icon',
                position: {
                  x: 12,
                  y: 24,
                },
                parentId: 'tracking-group',
                color: colors.teal,
                icon: 'user',
              },

              {
                id: 'tracking-script',
                type: 'icon',
                position: {
                  x: 75,
                  y: 24,
                },
                parentId: 'tracking-group',
                color: colors.teal,
                icon: 'code',
              },

              /* ------------------------------------------------------------------ */
              /* SESSION ACTIVITY                                                  */
              /* ------------------------------------------------------------------ */

              {
                id: 'activity-group',
                type: 'group',
                position: {
                  x: 445,
                  y: 245,
                },
                label: 'Activity',
                color: 'blue',
                width: 80,
                height: 205,
              },

              {
                id: 'pageviews',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'activity-group',
                color: 'blue',
                icon: 'activity',
              },

              {
                id: 'sessions',
                type: 'icon',
                position: {
                  x: 11,
                  y: 80,
                },
                parentId: 'activity-group',
                color: 'blue',
                icon: 'activity',
              },

              {
                id: 'interactions',
                type: 'icon',
                position: {
                  x: 11,
                  y: 142,
                },
                parentId: 'activity-group',
                color: 'blue',
                icon: 'click',
              },

              /* ------------------------------------------------------------------ */
              /* PROFILE BUILDING                                                  */
              /* ------------------------------------------------------------------ */

              {
                id: 'profile-group',
                type: 'group',
                position: {
                  x: 610,
                  y: 245,
                },
                label: 'Visitor Profile',
                color: colors.teal,
                width: 80,
                height: 205,
              },

              {
                id: 'identity',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'profile-group',
                color: colors.teal,
                icon: 'user',
              },

              {
                id: 'journey',
                type: 'icon',
                position: {
                  x: 11,
                  y: 80,
                },
                parentId: 'profile-group',
                color: colors.teal,
                icon: 'trend',
              },

              {
                id: 'device-data',
                type: 'icon',
                position: {
                  x: 11,
                  y: 142,
                },
                parentId: 'profile-group',
                color: colors.teal,
                icon: 'globe',
              },

              /* ------------------------------------------------------------------ */
              /* DATA                                                              */
              /* ------------------------------------------------------------------ */

              {
                id: 'storage-group',
                type: 'group',
                position: {
                  x: 775,
                  y: 265,
                },
                label: 'Visitor Data',
                color: 'pink',
                width: 80,
                height: 165,
              },

              {
                id: 'visitor-database',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'activity-history',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'storage-group',
                color: 'pink',
                icon: 'folder',
              },

              /* ------------------------------------------------------------------ */
              /* DIRECTORY                                                         */
              /* ------------------------------------------------------------------ */

              {
                id: 'visitor-directory',
                type: 'icon',
                position: {
                  x: 930,
                  y: 315,
                },
                label: 'Visitor Directory',
                color: colors.teal,
                icon: 'users',
              },

              {
                id: 'visitor-dashboard',
                type: 'browser',
                position: {
                  x: 1050,
                  y: 240,
                },
              },
            ],

            connections: [
              /* Visitors -> Tracking */

              {
                source: 'visitor-1',
                target: 'visitor-id',
              },

              {
                source: 'visitor-2',
                target: 'visitor-id',
              },

              {
                source: 'visitor-id',
                target: 'tracking-script',
              },

              /* Tracking -> Activity */

              {
                source: 'tracking-script',
                target: 'pageviews',
              },

              {
                source: 'tracking-script',
                target: 'sessions',
              },

              {
                source: 'tracking-script',
                target: 'interactions',
              },

              /* Activity -> Visitor Profile */

              {
                source: 'pageviews',
                target: 'journey',
              },

              {
                source: 'sessions',
                target: 'identity',
              },

              {
                source: 'sessions',
                target: 'device-data',
              },

              {
                source: 'interactions',
                target: 'journey',
              },

              /* Profile -> Storage */

              {
                source: 'identity',
                target: 'visitor-database',
              },

              {
                source: 'journey',
                target: 'activity-history',
              },

              {
                source: 'device-data',
                target: 'visitor-database',
              },

              /* Storage -> Directory */

              {
                source: 'visitor-database',
                target: 'visitor-directory',
              },

              {
                source: 'activity-history',
                target: 'visitor-directory',
              },

              /* Directory -> UI */

              {
                source: 'visitor-directory',
                target: 'visitor-dashboard',
              },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Turn every interaction into useful context',
            description:
              'Pathlens captures meaningful actions across your website and connects them with visitor, session, page and device context.',
            steps: [
              {
                number: '01',
                title: 'Capture',
                description:
                  'Track clicks, page views, form submissions, conversions and other important visitor actions.',
              },
              {
                number: '02',
                title: 'Enrich',
                description:
                  'Connect every event with its visitor, session, page, device and traffic context.',
              },
              {
                number: '03',
                title: 'Explore',
                description:
                  'Search and inspect your event stream to understand exactly what happened and where.',
              },
            ],
            visual: 'events-how-it-works',
          },

          workflow: {
            title: 'See every action as it happens',
            description:
              'Capture clicks, page views, form submissions, conversions and other meaningful actions with the visitor, session, page and device context behind them.',

            nodes: [
              /* ------------------------------------------------------------------ */
              /* VISITOR                                                           */
              /* ------------------------------------------------------------------ */

              {
                id: 'event-visitor',
                type: 'icon',
                position: {
                  x: 45,
                  y: 210,
                },
                label: 'Visitor',
                color: 'orange',
                icon: 'user',
              },

              /* ------------------------------------------------------------------ */
              /* TRACKING                                                          */
              /* ------------------------------------------------------------------ */

              {
                id: 'event-tracking-group',
                type: 'group',
                position: {
                  x: 180,
                  y: 270,
                },
                label: 'Tracking',
                color: colors.cyan,
                width: 145,
                height: 100,
              },

              {
                id: 'event-website',
                type: 'icon',
                position: {
                  x: 12,
                  y: 24,
                },
                parentId: 'event-tracking-group',
                color: colors.cyan,
                icon: 'globe',
              },

              {
                id: 'event-sdk',
                type: 'icon',
                position: {
                  x: 75,
                  y: 24,
                },
                parentId: 'event-tracking-group',
                color: colors.cyan,
                icon: 'code',
              },

              /* ------------------------------------------------------------------ */
              /* EVENTS                                                            */
              /* ------------------------------------------------------------------ */

              {
                id: 'event-capture-group',
                type: 'group',
                position: {
                  x: 390,
                  y: 235,
                },
                label: 'Event Capture',
                color: colors.cyan,
                width: 80,
                height: 220,
              },

              {
                id: 'page-view-event',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'event-capture-group',
                color: colors.cyan,
                icon: 'activity',
              },

              {
                id: 'interaction-event',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'event-capture-group',
                color: colors.cyan,
                icon: 'click',
              },

              {
                id: 'conversion-event',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'event-capture-group',
                color: colors.cyan,
                icon: 'target',
              },

              /* ------------------------------------------------------------------ */
              /* CONTEXT                                                           */
              /* ------------------------------------------------------------------ */

              {
                id: 'event-context-group',
                type: 'group',
                position: {
                  x: 550,
                  y: 235,
                },
                label: 'Context',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'visitor-context',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'event-context-group',
                color: 'blue',
                icon: 'user',
              },

              {
                id: 'session-context',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'event-context-group',
                color: 'blue',
                icon: 'activity',
              },

              {
                id: 'device-context',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'event-context-group',
                color: 'blue',
                icon: 'globe',
              },

              /* ------------------------------------------------------------------ */
              /* STORAGE                                                           */
              /* ------------------------------------------------------------------ */

              {
                id: 'event-storage-group',
                type: 'group',
                position: {
                  x: 710,
                  y: 255,
                },
                label: 'Event Data',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'event-database',
                type: 'icon',
                position: {
                  x: 11,
                  y: 20,
                },
                parentId: 'event-storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'event-history',
                type: 'icon',
                position: {
                  x: 11,
                  y: 88,
                },
                parentId: 'event-storage-group',
                color: 'pink',
                icon: 'folder',
              },

              /* ------------------------------------------------------------------ */
              /* EVENT STREAM                                                      */
              /* ------------------------------------------------------------------ */

              {
                id: 'event-stream',
                type: 'icon',
                position: {
                  x: 875,
                  y: 315,
                },
                label: 'Event Stream',
                color: colors.cyan,
                icon: 'activity',
              },

              {
                id: 'events-browser',
                type: 'browser',
                position: {
                  x: 995,
                  y: 240,
                },
              },
            ],

            connections: [
              {
                source: 'event-visitor',
                target: 'event-website',
              },

              {
                source: 'event-website',
                target: 'event-sdk',
              },

              {
                source: 'event-sdk',
                target: 'page-view-event',
              },

              {
                source: 'event-sdk',
                target: 'interaction-event',
              },

              {
                source: 'event-sdk',
                target: 'conversion-event',
              },

              {
                source: 'page-view-event',
                target: 'visitor-context',
              },

              {
                source: 'page-view-event',
                target: 'session-context',
              },

              {
                source: 'interaction-event',
                target: 'session-context',
              },

              {
                source: 'conversion-event',
                target: 'session-context',
              },

              {
                source: 'conversion-event',
                target: 'device-context',
              },

              {
                source: 'visitor-context',
                target: 'event-database',
              },

              {
                source: 'session-context',
                target: 'event-history',
              },

              {
                source: 'device-context',
                target: 'event-database',
              },

              {
                source: 'event-database',
                target: 'event-stream',
              },

              {
                source: 'event-history',
                target: 'event-stream',
              },

              {
                source: 'event-stream',
                target: 'events-browser',
              },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'See where journeys succeed or break down',
            description:
              'Pathlens turns your events into ordered conversion journeys so you can see how users progress through each step and where they leave.',
            steps: [
              {
                number: '01',
                title: 'Define',
                description:
                  'Choose the events or pages that make up the journey you want to measure.',
              },
              {
                number: '02',
                title: 'Measure',
                description:
                  'See how many visitors reach each step and where they continue or drop off.',
              },
              {
                number: '03',
                title: 'Improve',
                description:
                  'Identify friction points and use conversion data to improve important user journeys.',
              },
            ],
            visual: 'funnels-how-it-works',
          },

          workflow: {
            title: 'Understand where journeys convert or drop off',
            description:
              'Turn important website actions into step-by-step funnels and see where visitors progress, where they leave and which journeys drive conversions.',
            nodes: [
              /* ------------------------------------------------------------------ */
              /* VISITOR                                                           */
              /* ------------------------------------------------------------------ */

              {
                id: 'funnel-visitor',
                type: 'icon',
                position: {
                  x: 40,
                  y: 210,
                },
                label: 'Visitor',
                color: 'orange',
                icon: 'user',
              },

              /* ------------------------------------------------------------------ */
              /* EVENTS                                                            */
              /* ------------------------------------------------------------------ */

              {
                id: 'funnel-events-group',
                type: 'group',
                position: {
                  x: 180,
                  y: 245,
                },
                label: 'User Journey',
                color: colors.violet,
                width: 80,
                height: 220,
              },

              {
                id: 'funnel-step-1',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'funnel-events-group',
                color: colors.violet,
                icon: 'globe',
              },

              {
                id: 'funnel-step-2',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'funnel-events-group',
                color: colors.violet,
                icon: 'activity',
              },

              {
                id: 'funnel-step-3',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'funnel-events-group',
                color: colors.violet,
                icon: 'target',
              },

              /* ------------------------------------------------------------------ */
              /* FUNNEL DEFINITION                                                 */
              /* ------------------------------------------------------------------ */

              {
                id: 'funnel-definition-group',
                type: 'group',
                position: {
                  x: 350,
                  y: 245,
                },
                label: 'Funnel Steps',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'defined-step-1',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'funnel-definition-group',
                color: 'blue',
                icon: 'activity',
              },

              {
                id: 'defined-step-2',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'funnel-definition-group',
                color: 'blue',
                icon: 'trend',
              },

              {
                id: 'defined-step-3',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'funnel-definition-group',
                color: 'blue',
                icon: 'target',
              },

              /* ------------------------------------------------------------------ */
              /* ANALYSIS                                                          */
              /* ------------------------------------------------------------------ */

              {
                id: 'funnel-analysis-group',
                type: 'group',
                position: {
                  x: 520,
                  y: 245,
                },
                label: 'Funnel Analysis',
                color: colors.violet,
                width: 80,
                height: 220,
              },

              {
                id: 'progress-analysis',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'funnel-analysis-group',
                color: colors.violet,
                icon: 'trend',
              },

              {
                id: 'dropoff-analysis',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'funnel-analysis-group',
                color: colors.violet,
                icon: 'activity',
              },

              {
                id: 'conversion-analysis',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'funnel-analysis-group',
                color: colors.violet,
                icon: 'target',
              },

              /* ------------------------------------------------------------------ */
              /* DATA                                                              */
              /* ------------------------------------------------------------------ */

              {
                id: 'funnel-storage-group',
                type: 'group',
                position: {
                  x: 690,
                  y: 265,
                },
                label: 'Conversion Data',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'funnel-database',
                type: 'icon',
                position: {
                  x: 11,
                  y: 20,
                },
                parentId: 'funnel-storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'funnel-history',
                type: 'icon',
                position: {
                  x: 11,
                  y: 88,
                },
                parentId: 'funnel-storage-group',
                color: 'pink',
                icon: 'folder',
              },

              /* ------------------------------------------------------------------ */
              /* RESULTS                                                           */
              /* ------------------------------------------------------------------ */

              {
                id: 'funnel-insights',
                type: 'icon',
                position: {
                  x: 855,
                  y: 315,
                },
                label: 'Funnel Insights',
                color: colors.violet,
                icon: 'trend',
              },

              {
                id: 'funnel-browser',
                type: 'browser',
                position: {
                  x: 980,
                  y: 240,
                },
              },
            ],

            connections: [
              /* Visitor -> Journey */

              {
                source: 'funnel-visitor',
                target: 'funnel-step-1',
              },

              {
                source: 'funnel-step-1',
                target: 'funnel-step-2',
              },

              {
                source: 'funnel-step-2',
                target: 'funnel-step-3',
              },

              /* Journey -> Funnel Definition */

              {
                source: 'funnel-step-1',
                target: 'defined-step-1',
              },

              {
                source: 'funnel-step-2',
                target: 'defined-step-2',
              },

              {
                source: 'funnel-step-3',
                target: 'defined-step-3',
              },

              /* Funnel Definition -> Analysis */

              {
                source: 'defined-step-1',
                target: 'progress-analysis',
              },

              {
                source: 'defined-step-2',
                target: 'dropoff-analysis',
              },

              {
                source: 'defined-step-3',
                target: 'conversion-analysis',
              },

              /* Analysis -> Data */

              {
                source: 'progress-analysis',
                target: 'funnel-database',
              },

              {
                source: 'dropoff-analysis',
                target: 'funnel-history',
              },

              {
                source: 'conversion-analysis',
                target: 'funnel-database',
              },

              /* Data -> Insights */

              {
                source: 'funnel-database',
                target: 'funnel-insights',
              },

              {
                source: 'funnel-history',
                target: 'funnel-insights',
              },

              /* Insights -> Dashboard */

              {
                source: 'funnel-insights',
                target: 'funnel-browser',
              },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Turn important actions into measurable outcomes',
            description:
              'Pathlens lets you define meaningful business outcomes as goals and continuously measure how often visitors complete them.',
            steps: [
              {
                number: '01',
                title: 'Define',
                description:
                  'Choose the event, page, form, button or revenue action that represents a meaningful business outcome.',
              },
              {
                number: '02',
                title: 'Track',
                description:
                  'Measure every time visitors complete the goal and connect it with their session and journey context.',
              },
              {
                number: '03',
                title: 'Improve',
                description:
                  'Compare performance over time and understand which traffic sources and journeys drive the most conversions.',
              },
            ],
            visual: 'goals-how-it-works',
          },

          workflow: {
            title: 'Measure the outcomes that matter',
            description:
              'Define important actions as goals, track when visitors complete them and connect every conversion back to the journey, source and session that produced it.',

            nodes: [
              /* ------------------------------------------------------------------ */
              /* VISITOR                                                           */
              /* ------------------------------------------------------------------ */

              {
                id: 'goal-visitor',
                type: 'icon',
                position: {
                  x: 40,
                  y: 210,
                },
                label: 'Visitor',
                color: 'orange',
                icon: 'user',
              },

              /* ------------------------------------------------------------------ */
              /* USER ACTIONS                                                      */
              /* ------------------------------------------------------------------ */

              {
                id: 'goal-actions-group',
                type: 'group',
                position: {
                  x: 180,
                  y: 240,
                },
                label: 'Visitor Actions',
                color: colors.amber,
                width: 80,
                height: 220,
              },

              {
                id: 'page-action',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'goal-actions-group',
                color: colors.amber,
                icon: 'globe',
              },

              {
                id: 'form-action',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'goal-actions-group',
                color: colors.amber,
                icon: 'click',
              },

              {
                id: 'conversion-action',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'goal-actions-group',
                color: colors.amber,
                icon: 'target',
              },

              /* ------------------------------------------------------------------ */
              /* GOAL DEFINITION                                                   */
              /* ------------------------------------------------------------------ */

              {
                id: 'goal-definition-group',
                type: 'group',
                position: {
                  x: 350,
                  y: 240,
                },
                label: 'Goal Definition',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'event-goal',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'goal-definition-group',
                color: 'blue',
                icon: 'activity',
              },

              {
                id: 'page-goal',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'goal-definition-group',
                color: 'blue',
                icon: 'globe',
              },

              {
                id: 'revenue-goal',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'goal-definition-group',
                color: 'blue',
                icon: 'target',
              },

              /* ------------------------------------------------------------------ */
              /* CONVERSION ENGINE                                                 */
              /* ------------------------------------------------------------------ */

              {
                id: 'goal-engine-group',
                type: 'group',
                position: {
                  x: 520,
                  y: 240,
                },
                label: 'Goal Matching',
                color: colors.amber,
                width: 80,
                height: 220,
              },

              {
                id: 'match-event',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'goal-engine-group',
                color: colors.amber,
                icon: 'activity',
              },

              {
                id: 'match-session',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'goal-engine-group',
                color: colors.amber,
                icon: 'user',
              },

              {
                id: 'goal-completed',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'goal-engine-group',
                color: colors.amber,
                icon: 'target',
              },

              /* ------------------------------------------------------------------ */
              /* GOAL DATA                                                         */
              /* ------------------------------------------------------------------ */

              {
                id: 'goal-data-group',
                type: 'group',
                position: {
                  x: 690,
                  y: 260,
                },
                label: 'Goal Data',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'goal-database',
                type: 'icon',
                position: {
                  x: 11,
                  y: 20,
                },
                parentId: 'goal-data-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'conversion-history',
                type: 'icon',
                position: {
                  x: 11,
                  y: 88,
                },
                parentId: 'goal-data-group',
                color: 'pink',
                icon: 'folder',
              },

              /* ------------------------------------------------------------------ */
              /* GOAL INSIGHTS                                                     */
              /* ------------------------------------------------------------------ */

              {
                id: 'goal-insights',
                type: 'icon',
                position: {
                  x: 855,
                  y: 315,
                },
                label: 'Goal Insights',
                color: colors.amber,
                icon: 'target',
              },

              {
                id: 'goal-browser',
                type: 'browser',
                position: {
                  x: 980,
                  y: 240,
                },
              },
            ],

            connections: [
              /* Visitor -> Actions */

              {
                source: 'goal-visitor',
                target: 'page-action',
              },

              {
                source: 'goal-visitor',
                target: 'form-action',
              },

              {
                source: 'goal-visitor',
                target: 'conversion-action',
              },

              /* Actions -> Goal Definition */

              {
                source: 'page-action',
                target: 'page-goal',
              },

              {
                source: 'form-action',
                target: 'event-goal',
              },

              {
                source: 'conversion-action',
                target: 'revenue-goal',
              },

              /* Goal Definition -> Matching */

              {
                source: 'event-goal',
                target: 'match-event',
              },

              {
                source: 'page-goal',
                target: 'match-event',
              },

              {
                source: 'revenue-goal',
                target: 'goal-completed',
              },

              {
                source: 'match-event',
                target: 'match-session',
              },

              {
                source: 'match-session',
                target: 'goal-completed',
              },

              /* Matching -> Storage */

              {
                source: 'goal-completed',
                target: 'goal-database',
              },

              {
                source: 'match-session',
                target: 'conversion-history',
              },

              /* Storage -> Insights */

              {
                source: 'goal-database',
                target: 'goal-insights',
              },

              {
                source: 'conversion-history',
                target: 'goal-insights',
              },

              /* Insights -> Dashboard */

              {
                source: 'goal-insights',
                target: 'goal-browser',
              },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'See exactly how visitors experience your website',
            description:
              'Pathlens captures visitor interactions and reconstructs them into replayable sessions so you can understand behavior in context.',
            steps: [
              {
                number: '01',
                title: 'Capture',
                description:
                  'Record page changes, clicks, scrolling, navigation and other meaningful interactions during each session.',
              },
              {
                number: '02',
                title: 'Reconstruct',
                description:
                  'Combine interaction data with page and session context to recreate the visitor experience.',
              },
              {
                number: '03',
                title: 'Review',
                description:
                  'Replay sessions to investigate friction, errors, hesitation and the behavior behind conversions.',
              },
            ],
            visual: 'session-replay-how-it-works',
          },

          workflow: {
            title: 'Replay the experience behind every session',
            description:
              'Capture visitor interactions, reconstruct each session and replay the complete journey to understand navigation, friction, errors and conversion behavior.',

            nodes: [
              /* ------------------------------------------------------------------ */
              /* VISITOR                                                           */
              /* ------------------------------------------------------------------ */

              {
                id: 'replay-visitor',
                type: 'icon',
                position: {
                  x: 40,
                  y: 210,
                },
                label: 'Visitor',
                color: 'orange',
                icon: 'user',
              },

              /* ------------------------------------------------------------------ */
              /* CAPTURE                                                           */
              /* ------------------------------------------------------------------ */

              {
                id: 'replay-capture-group',
                type: 'group',
                position: {
                  x: 180,
                  y: 240,
                },
                label: 'Session Capture',
                color: colors.indigo,
                width: 80,
                height: 220,
              },

              {
                id: 'replay-navigation',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'replay-capture-group',
                color: colors.indigo,
                icon: 'globe',
              },

              {
                id: 'replay-interactions',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'replay-capture-group',
                color: colors.indigo,
                icon: 'click',
              },

              {
                id: 'replay-events',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'replay-capture-group',
                color: colors.indigo,
                icon: 'activity',
              },

              /* ------------------------------------------------------------------ */
              /* SESSION CONTEXT                                                   */
              /* ------------------------------------------------------------------ */

              {
                id: 'replay-context-group',
                type: 'group',
                position: {
                  x: 350,
                  y: 240,
                },
                label: 'Session Context',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'replay-visitor-context',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'replay-context-group',
                color: 'blue',
                icon: 'user',
              },

              {
                id: 'replay-page-context',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'replay-context-group',
                color: 'blue',
                icon: 'globe',
              },

              {
                id: 'replay-device-context',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'replay-context-group',
                color: 'blue',
                icon: 'gauge',
              },

              /* ------------------------------------------------------------------ */
              /* RECONSTRUCTION                                                    */
              /* ------------------------------------------------------------------ */

              {
                id: 'replay-engine-group',
                type: 'group',
                position: {
                  x: 520,
                  y: 240,
                },
                label: 'Replay Engine',
                color: colors.indigo,
                width: 80,
                height: 220,
              },

              {
                id: 'replay-timeline',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'replay-engine-group',
                color: colors.indigo,
                icon: 'activity',
              },

              {
                id: 'replay-render',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'replay-engine-group',
                color: colors.indigo,
                icon: 'eye',
              },

              {
                id: 'replay-playback',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'replay-engine-group',
                color: colors.indigo,
                icon: 'play',
              },

              /* ------------------------------------------------------------------ */
              /* SESSION DATA                                                      */
              /* ------------------------------------------------------------------ */

              {
                id: 'replay-storage-group',
                type: 'group',
                position: {
                  x: 690,
                  y: 260,
                },
                label: 'Session Data',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'replay-database',
                type: 'icon',
                position: {
                  x: 11,
                  y: 20,
                },
                parentId: 'replay-storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'replay-history',
                type: 'icon',
                position: {
                  x: 11,
                  y: 88,
                },
                parentId: 'replay-storage-group',
                color: 'pink',
                icon: 'folder',
              },

              /* ------------------------------------------------------------------ */
              /* PLAYER                                                            */
              /* ------------------------------------------------------------------ */

              {
                id: 'replay-insights',
                type: 'icon',
                position: {
                  x: 855,
                  y: 315,
                },
                label: 'Session Replay',
                color: colors.indigo,
                icon: 'play',
              },

              {
                id: 'replay-browser',
                type: 'browser',
                position: {
                  x: 980,
                  y: 240,
                },
              },
            ],

            connections: [
              /* Visitor -> Capture */

              {
                source: 'replay-visitor',
                target: 'replay-navigation',
              },

              {
                source: 'replay-visitor',
                target: 'replay-interactions',
              },

              {
                source: 'replay-visitor',
                target: 'replay-events',
              },

              /* Capture -> Context */

              {
                source: 'replay-navigation',
                target: 'replay-page-context',
              },

              {
                source: 'replay-interactions',
                target: 'replay-visitor-context',
              },

              {
                source: 'replay-events',
                target: 'replay-device-context',
              },

              /* Context -> Replay Engine */

              {
                source: 'replay-visitor-context',
                target: 'replay-timeline',
              },

              {
                source: 'replay-page-context',
                target: 'replay-render',
              },

              {
                source: 'replay-device-context',
                target: 'replay-playback',
              },

              {
                source: 'replay-timeline',
                target: 'replay-render',
              },

              {
                source: 'replay-render',
                target: 'replay-playback',
              },

              /* Replay Engine -> Storage */

              {
                source: 'replay-timeline',
                target: 'replay-database',
              },

              {
                source: 'replay-playback',
                target: 'replay-history',
              },

              /* Storage -> Replay */

              {
                source: 'replay-database',
                target: 'replay-insights',
              },

              {
                source: 'replay-history',
                target: 'replay-insights',
              },

              /* Replay -> Player */

              {
                source: 'replay-insights',
                target: 'replay-browser',
              },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Turn interaction data into a visual map',
            description:
              'Pathlens combines clicks, scroll depth and page context to show where visitors focus, interact and stop engaging.',
            steps: [
              {
                number: '01',
                title: 'Capture',
                description:
                  'Track clicks, pointer positions and scroll depth across your website pages.',
              },
              {
                number: '02',
                title: 'Aggregate',
                description:
                  'Combine interaction data from many visitors into a clear visual representation of page behavior.',
              },
              {
                number: '03',
                title: 'Interpret',
                description:
                  'See attention hotspots, ignored areas and where visitors stop scrolling.',
              },
            ],
            visual: 'heatmaps-how-it-works',
          },

          workflow: {
            title: 'See where visitors focus and interact',
            description:
              'Capture clicks and scroll behavior, combine interactions across visitors and turn them into visual heatmaps that reveal attention and drop-off.',

            nodes: [
              {
                id: 'heatmap-visitor',
                type: 'icon',
                position: { x: 40, y: 210 },
                label: 'Visitor',
                color: 'orange',
                icon: 'user',
              },

              {
                id: 'heatmap-capture-group',
                type: 'group',
                position: { x: 180, y: 240 },
                label: 'Interaction Capture',
                color: colors.orange,
                width: 80,
                height: 220,
              },

              {
                id: 'heatmap-clicks',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'heatmap-capture-group',
                color: colors.orange,
                icon: 'click',
              },

              {
                id: 'heatmap-scroll',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'heatmap-capture-group',
                color: colors.orange,
                icon: 'activity',
              },

              {
                id: 'heatmap-position',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'heatmap-capture-group',
                color: colors.orange,
                icon: 'crosshair',
              },

              {
                id: 'heatmap-context-group',
                type: 'group',
                position: { x: 350, y: 240 },
                label: 'Page Context',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'heatmap-page',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'heatmap-context-group',
                color: 'blue',
                icon: 'globe',
              },

              {
                id: 'heatmap-device',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'heatmap-context-group',
                color: 'blue',
                icon: 'gauge',
              },

              {
                id: 'heatmap-session',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'heatmap-context-group',
                color: 'blue',
                icon: 'user',
              },

              {
                id: 'heatmap-engine-group',
                type: 'group',
                position: { x: 520, y: 240 },
                label: 'Heatmap Engine',
                color: colors.orange,
                width: 80,
                height: 220,
              },

              {
                id: 'heatmap-aggregate',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'heatmap-engine-group',
                color: colors.orange,
                icon: 'database',
              },

              {
                id: 'heatmap-density',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'heatmap-engine-group',
                color: colors.orange,
                icon: 'crosshair',
              },

              {
                id: 'heatmap-render',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'heatmap-engine-group',
                color: colors.orange,
                icon: 'eye',
              },

              {
                id: 'heatmap-storage-group',
                type: 'group',
                position: { x: 690, y: 260 },
                label: 'Heatmap Data',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'heatmap-database',
                type: 'icon',
                position: { x: 11, y: 20 },
                parentId: 'heatmap-storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'heatmap-history',
                type: 'icon',
                position: { x: 11, y: 88 },
                parentId: 'heatmap-storage-group',
                color: 'pink',
                icon: 'folder',
              },

              {
                id: 'heatmap-insights',
                type: 'icon',
                position: { x: 855, y: 315 },
                label: 'Heatmap View',
                color: colors.orange,
                icon: 'crosshair',
              },

              {
                id: 'heatmap-browser',
                type: 'browser',
                position: { x: 980, y: 240 },
              },
            ],

            connections: [
              { source: 'heatmap-visitor', target: 'heatmap-clicks' },
              { source: 'heatmap-visitor', target: 'heatmap-scroll' },
              { source: 'heatmap-visitor', target: 'heatmap-position' },

              { source: 'heatmap-clicks', target: 'heatmap-page' },
              { source: 'heatmap-scroll', target: 'heatmap-device' },
              { source: 'heatmap-position', target: 'heatmap-session' },

              { source: 'heatmap-page', target: 'heatmap-aggregate' },
              { source: 'heatmap-device', target: 'heatmap-density' },
              { source: 'heatmap-session', target: 'heatmap-render' },

              { source: 'heatmap-aggregate', target: 'heatmap-database' },
              { source: 'heatmap-density', target: 'heatmap-history' },
              { source: 'heatmap-render', target: 'heatmap-database' },

              { source: 'heatmap-database', target: 'heatmap-insights' },
              { source: 'heatmap-history', target: 'heatmap-insights' },

              { source: 'heatmap-insights', target: 'heatmap-browser' },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Understand every click in context',
            description:
              'Pathlens captures click interactions and connects them with the element, page, visitor and session behind each action.',
            steps: [
              {
                number: '01',
                title: 'Capture',
                description:
                  'Track click coordinates, elements and interaction details across your website.',
              },
              {
                number: '02',
                title: 'Connect',
                description:
                  'Add page, visitor, device and session context to every captured interaction.',
              },
              {
                number: '03',
                title: 'Analyze',
                description:
                  'See which elements attract interaction and which areas of your interface are ignored.',
              },
            ],
            visual: 'click-analytics-how-it-works',
          },

          workflow: {
            title: 'Understand what visitors choose to click',
            description:
              'Capture every click with element and coordinate data, connect it to visitor context and reveal which parts of your website attract the most interaction.',

            nodes: [
              {
                id: 'click-visitor',
                type: 'icon',
                position: { x: 40, y: 210 },
                label: 'Visitor',
                color: 'orange',
                icon: 'user',
              },

              {
                id: 'click-capture-group',
                type: 'group',
                position: { x: 180, y: 240 },
                label: 'Click Capture',
                color: colors.red,
                width: 80,
                height: 220,
              },

              {
                id: 'click-coordinate',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'click-capture-group',
                color: colors.red,
                icon: 'crosshair',
              },

              {
                id: 'click-element',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'click-capture-group',
                color: colors.red,
                icon: 'click',
              },

              {
                id: 'click-action',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'click-capture-group',
                color: colors.red,
                icon: 'click',
              },

              {
                id: 'click-context-group',
                type: 'group',
                position: { x: 350, y: 240 },
                label: 'Interaction Context',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'click-page',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'click-context-group',
                color: 'blue',
                icon: 'globe',
              },

              {
                id: 'click-visitor-context',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'click-context-group',
                color: 'blue',
                icon: 'user',
              },

              {
                id: 'click-session',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'click-context-group',
                color: 'blue',
                icon: 'activity',
              },

              {
                id: 'click-analysis-group',
                type: 'group',
                position: { x: 520, y: 240 },
                label: 'Click Analysis',
                color: colors.red,
                width: 80,
                height: 220,
              },

              {
                id: 'click-frequency',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'click-analysis-group',
                color: colors.red,
                icon: 'chart',
              },

              {
                id: 'click-ranking',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'click-analysis-group',
                color: colors.red,
                icon: 'trend',
              },

              {
                id: 'click-insight-engine',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'click-analysis-group',
                color: colors.red,
                icon: 'chart',
              },

              {
                id: 'click-storage-group',
                type: 'group',
                position: { x: 690, y: 260 },
                label: 'Click Data',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'click-database',
                type: 'icon',
                position: { x: 11, y: 20 },
                parentId: 'click-storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'click-history',
                type: 'icon',
                position: { x: 11, y: 88 },
                parentId: 'click-storage-group',
                color: 'pink',
                icon: 'folder',
              },

              {
                id: 'click-insights',
                type: 'icon',
                position: { x: 855, y: 315 },
                label: 'Click Insights',
                color: colors.red,
                icon: 'click',
              },

              {
                id: 'click-browser',
                type: 'browser',
                position: { x: 980, y: 240 },
              },
            ],

            connections: [
              { source: 'click-visitor', target: 'click-coordinate' },
              { source: 'click-visitor', target: 'click-element' },
              { source: 'click-visitor', target: 'click-action' },

              { source: 'click-coordinate', target: 'click-page' },
              { source: 'click-element', target: 'click-visitor-context' },
              { source: 'click-action', target: 'click-session' },

              { source: 'click-page', target: 'click-frequency' },
              { source: 'click-visitor-context', target: 'click-ranking' },
              { source: 'click-session', target: 'click-insight-engine' },

              { source: 'click-frequency', target: 'click-database' },
              { source: 'click-ranking', target: 'click-history' },
              { source: 'click-insight-engine', target: 'click-database' },

              { source: 'click-database', target: 'click-insights' },
              { source: 'click-history', target: 'click-insights' },

              { source: 'click-insights', target: 'click-browser' },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Turn scattered activity into a complete journey',
            description:
              'Pathlens connects sessions, pages and events into a chronological activity stream for each anonymous visitor.',
            steps: [
              {
                number: '01',
                title: 'Collect',
                description:
                  'Capture page views, sessions, events and interactions as visitors move through your website.',
              },
              {
                number: '02',
                title: 'Connect',
                description:
                  'Associate activity with the same anonymous visitor across pages and sessions.',
              },
              {
                number: '03',
                title: 'Explore',
                description:
                  'Follow the complete visitor timeline to understand engagement, intent and conversion behavior.',
              },
            ],
            visual: 'visitor-activity-how-it-works',
          },

          workflow: {
            title: 'Follow every visitor journey over time',
            description:
              'Connect sessions, pages and events into one chronological activity stream so you can understand how each visitor moves through your website.',

            nodes: [
              {
                id: 'activity-visitor',
                type: 'icon',
                position: { x: 40, y: 210 },
                label: 'Visitor',
                color: 'orange',
                icon: 'user',
              },

              {
                id: 'activity-capture-group',
                type: 'group',
                position: { x: 180, y: 240 },
                label: 'Activity Capture',
                color: colors.emerald,
                width: 80,
                height: 220,
              },

              {
                id: 'activity-pageview',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'activity-capture-group',
                color: colors.emerald,
                icon: 'globe',
              },

              {
                id: 'activity-session',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'activity-capture-group',
                color: colors.emerald,
                icon: 'activity',
              },

              {
                id: 'activity-event',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'activity-capture-group',
                color: colors.emerald,
                icon: 'activity',
              },

              {
                id: 'activity-identity-group',
                type: 'group',
                position: { x: 350, y: 240 },
                label: 'Visitor Identity',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'activity-id',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'activity-identity-group',
                color: 'blue',
                icon: 'user',
              },

              {
                id: 'activity-device',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'activity-identity-group',
                color: 'blue',
                icon: 'globe',
              },

              {
                id: 'activity-session-link',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'activity-identity-group',
                color: 'blue',
                icon: 'activity',
              },

              {
                id: 'activity-timeline-group',
                type: 'group',
                position: { x: 520, y: 240 },
                label: 'Activity Timeline',
                color: colors.emerald,
                width: 80,
                height: 220,
              },

              {
                id: 'activity-order',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'activity-timeline-group',
                color: colors.emerald,
                icon: 'activity',
              },

              {
                id: 'activity-journey',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'activity-timeline-group',
                color: colors.emerald,
                icon: 'trend',
              },

              {
                id: 'activity-outcome',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'activity-timeline-group',
                color: colors.emerald,
                icon: 'target',
              },

              {
                id: 'activity-storage-group',
                type: 'group',
                position: { x: 690, y: 260 },
                label: 'Activity Data',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'activity-database',
                type: 'icon',
                position: { x: 11, y: 20 },
                parentId: 'activity-storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'activity-history',
                type: 'icon',
                position: { x: 11, y: 88 },
                parentId: 'activity-storage-group',
                color: 'pink',
                icon: 'folder',
              },

              {
                id: 'activity-insights',
                type: 'icon',
                position: { x: 855, y: 315 },
                label: 'Visitor Timeline',
                color: colors.emerald,
                icon: 'eye',
              },

              {
                id: 'activity-browser',
                type: 'browser',
                position: { x: 980, y: 240 },
              },
            ],

            connections: [
              { source: 'activity-visitor', target: 'activity-pageview' },
              { source: 'activity-visitor', target: 'activity-session' },
              { source: 'activity-visitor', target: 'activity-event' },

              { source: 'activity-pageview', target: 'activity-id' },
              { source: 'activity-session', target: 'activity-device' },
              { source: 'activity-event', target: 'activity-session-link' },

              { source: 'activity-id', target: 'activity-order' },
              { source: 'activity-device', target: 'activity-journey' },
              { source: 'activity-session-link', target: 'activity-outcome' },

              { source: 'activity-order', target: 'activity-database' },
              { source: 'activity-journey', target: 'activity-history' },
              { source: 'activity-outcome', target: 'activity-database' },

              { source: 'activity-database', target: 'activity-insights' },
              { source: 'activity-history', target: 'activity-insights' },

              { source: 'activity-insights', target: 'activity-browser' },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Understand where your website slows down',
            description:
              'Pathlens captures real browser performance signals and connects them with pages, devices and visitor context.',
            steps: [
              {
                number: '01',
                title: 'Measure',
                description:
                  'Capture page load, rendering and browser performance signals from real visitor sessions.',
              },
              {
                number: '02',
                title: 'Compare',
                description:
                  'Break performance down by page, browser, device and other meaningful dimensions.',
              },
              {
                number: '03',
                title: 'Improve',
                description:
                  'Find slow pages and recurring performance issues that may affect visitor experience.',
              },
            ],
            visual: 'performance-how-it-works',
          },

          workflow: {
            title: 'See where performance affects the experience',
            description:
              'Measure real browser performance, connect slowdowns with page and device context and identify where speed issues are concentrated.',

            nodes: [
              {
                id: 'performance-visitor',
                type: 'icon',
                position: { x: 40, y: 210 },
                label: 'Visitor',
                color: 'orange',
                icon: 'user',
              },

              {
                id: 'performance-capture-group',
                type: 'group',
                position: { x: 180, y: 240 },
                label: 'Performance Capture',
                color: colors.emerald,
                width: 80,
                height: 220,
              },

              {
                id: 'performance-load',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'performance-capture-group',
                color: colors.emerald,
                icon: 'gauge',
              },

              {
                id: 'performance-render',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'performance-capture-group',
                color: colors.emerald,
                icon: 'gauge',
              },

              {
                id: 'performance-response',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'performance-capture-group',
                color: colors.emerald,
                icon: 'activity',
              },

              {
                id: 'performance-context-group',
                type: 'group',
                position: { x: 350, y: 240 },
                label: 'Browser Context',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'performance-page',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'performance-context-group',
                color: 'blue',
                icon: 'globe',
              },

              {
                id: 'performance-device',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'performance-context-group',
                color: 'blue',
                icon: 'gauge',
              },

              {
                id: 'performance-browser',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'performance-context-group',
                color: 'blue',
                icon: 'globe',
              },

              {
                id: 'performance-analysis-group',
                type: 'group',
                position: { x: 520, y: 240 },
                label: 'Performance Analysis',
                color: colors.emerald,
                width: 80,
                height: 220,
              },

              {
                id: 'performance-aggregate',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'performance-analysis-group',
                color: colors.emerald,
                icon: 'database',
              },

              {
                id: 'performance-compare',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'performance-analysis-group',
                color: colors.emerald,
                icon: 'chart',
              },

              {
                id: 'performance-issues',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'performance-analysis-group',
                color: colors.emerald,
                icon: 'gauge',
              },

              {
                id: 'performance-storage-group',
                type: 'group',
                position: { x: 690, y: 260 },
                label: 'Performance Data',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'performance-database',
                type: 'icon',
                position: { x: 11, y: 20 },
                parentId: 'performance-storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'performance-history',
                type: 'icon',
                position: { x: 11, y: 88 },
                parentId: 'performance-storage-group',
                color: 'pink',
                icon: 'folder',
              },

              {
                id: 'performance-insights',
                type: 'icon',
                position: { x: 855, y: 315 },
                label: 'Performance Insights',
                color: colors.emerald,
                icon: 'gauge',
              },

              {
                id: 'performance-dashboard',
                type: 'browser',
                position: { x: 980, y: 240 },
              },
            ],

            connections: [
              { source: 'performance-visitor', target: 'performance-load' },
              { source: 'performance-visitor', target: 'performance-render' },
              { source: 'performance-visitor', target: 'performance-response' },

              { source: 'performance-load', target: 'performance-page' },
              { source: 'performance-render', target: 'performance-device' },
              { source: 'performance-response', target: 'performance-browser' },

              { source: 'performance-page', target: 'performance-aggregate' },
              { source: 'performance-device', target: 'performance-compare' },
              { source: 'performance-browser', target: 'performance-issues' },

              {
                source: 'performance-aggregate',
                target: 'performance-database',
              },
              { source: 'performance-compare', target: 'performance-history' },
              { source: 'performance-issues', target: 'performance-database' },

              {
                source: 'performance-database',
                target: 'performance-insights',
              },
              { source: 'performance-history', target: 'performance-insights' },

              {
                source: 'performance-insights',
                target: 'performance-dashboard',
              },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Understand what drives visitors to your website',
            description:
              'Pathlens connects every session with its acquisition source, campaign, location and audience context.',
            steps: [
              {
                number: '01',
                title: 'Capture',
                description:
                  'Identify referrers, campaign parameters, landing pages and other acquisition signals.',
              },
              {
                number: '02',
                title: 'Group',
                description:
                  'Organize traffic into meaningful sources, channels, countries and audience segments.',
              },
              {
                number: '03',
                title: 'Compare',
                description:
                  'See which sources bring the most visitors, engagement and conversions.',
              },
            ],
            visual: 'traffic-sources-how-it-works',
          },

          workflow: {
            title: 'Understand where your traffic comes from',
            description:
              'Connect every website visit with its source, campaign, location and audience context to see which channels drive meaningful traffic.',

            nodes: [
              {
                id: 'traffic-visitor',
                type: 'icon',
                position: { x: 40, y: 210 },
                label: 'Visitor',
                color: 'orange',
                icon: 'user',
              },

              {
                id: 'traffic-capture-group',
                type: 'group',
                position: { x: 180, y: 240 },
                label: 'Acquisition Capture',
                color: colors.cyan,
                width: 80,
                height: 220,
              },

              {
                id: 'traffic-referrer',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'traffic-capture-group',
                color: colors.cyan,
                icon: 'globe',
              },

              {
                id: 'traffic-campaign',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'traffic-capture-group',
                color: colors.cyan,
                icon: 'trend',
              },

              {
                id: 'traffic-landing',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'traffic-capture-group',
                color: colors.cyan,
                icon: 'globe',
              },

              {
                id: 'traffic-context-group',
                type: 'group',
                position: { x: 350, y: 240 },
                label: 'Traffic Context',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'traffic-source',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'traffic-context-group',
                color: 'blue',
                icon: 'globe',
              },

              {
                id: 'traffic-country',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'traffic-context-group',
                color: 'blue',
                icon: 'globe',
              },

              {
                id: 'traffic-segment',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'traffic-context-group',
                color: 'blue',
                icon: 'users',
              },

              {
                id: 'traffic-analysis-group',
                type: 'group',
                position: { x: 520, y: 240 },
                label: 'Traffic Analysis',
                color: colors.cyan,
                width: 80,
                height: 220,
              },

              {
                id: 'traffic-grouping',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'traffic-analysis-group',
                color: colors.cyan,
                icon: 'chart',
              },

              {
                id: 'traffic-engagement',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'traffic-analysis-group',
                color: colors.cyan,
                icon: 'activity',
              },

              {
                id: 'traffic-conversion',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'traffic-analysis-group',
                color: colors.cyan,
                icon: 'target',
              },

              {
                id: 'traffic-storage-group',
                type: 'group',
                position: { x: 690, y: 260 },
                label: 'Traffic Data',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'traffic-database',
                type: 'icon',
                position: { x: 11, y: 20 },
                parentId: 'traffic-storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'traffic-history',
                type: 'icon',
                position: { x: 11, y: 88 },
                parentId: 'traffic-storage-group',
                color: 'pink',
                icon: 'folder',
              },

              {
                id: 'traffic-insights',
                type: 'icon',
                position: { x: 855, y: 315 },
                label: 'Traffic Insights',
                color: colors.cyan,
                icon: 'chart',
              },

              {
                id: 'traffic-dashboard',
                type: 'browser',
                position: { x: 980, y: 240 },
              },
            ],

            connections: [
              { source: 'traffic-visitor', target: 'traffic-referrer' },
              { source: 'traffic-visitor', target: 'traffic-campaign' },
              { source: 'traffic-visitor', target: 'traffic-landing' },

              { source: 'traffic-referrer', target: 'traffic-source' },
              { source: 'traffic-campaign', target: 'traffic-country' },
              { source: 'traffic-landing', target: 'traffic-segment' },

              { source: 'traffic-source', target: 'traffic-grouping' },
              { source: 'traffic-country', target: 'traffic-engagement' },
              { source: 'traffic-segment', target: 'traffic-conversion' },

              { source: 'traffic-grouping', target: 'traffic-database' },
              { source: 'traffic-engagement', target: 'traffic-history' },
              { source: 'traffic-conversion', target: 'traffic-database' },

              { source: 'traffic-database', target: 'traffic-insights' },
              { source: 'traffic-history', target: 'traffic-insights' },

              { source: 'traffic-insights', target: 'traffic-dashboard' },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Turn analytics into clear, shareable summaries',
            description:
              'Pathlens brings important website metrics together into focused reports for teams, campaigns and stakeholders.',
            steps: [
              {
                number: '01',
                title: 'Select',
                description:
                  'Choose the metrics, date range and website data you want to include.',
              },
              {
                number: '02',
                title: 'Summarize',
                description:
                  'Combine traffic, engagement, conversion and audience metrics into a clear report.',
              },
              {
                number: '03',
                title: 'Share',
                description:
                  'Present website performance in a format that is easy for teams and stakeholders to understand.',
              },
            ],
            visual: 'reports-how-it-works',
          },

          workflow: {
            title: 'Turn website data into clear reports',
            description:
              'Bring traffic, engagement, audience and conversion metrics together into concise reports that are easy to review and share.',

            nodes: [
              {
                id: 'report-source',
                type: 'icon',
                position: { x: 40, y: 210 },
                label: 'Analytics',
                color: 'orange',
                icon: 'chart',
              },

              {
                id: 'report-data-group',
                type: 'group',
                position: { x: 180, y: 240 },
                label: 'Report Data',
                color: colors.slate,
                width: 80,
                height: 220,
              },

              {
                id: 'report-traffic',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'report-data-group',
                color: colors.slate,
                icon: 'globe',
              },

              {
                id: 'report-engagement',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'report-data-group',
                color: colors.slate,
                icon: 'activity',
              },

              {
                id: 'report-conversions',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'report-data-group',
                color: colors.slate,
                icon: 'target',
              },

              {
                id: 'report-config-group',
                type: 'group',
                position: { x: 350, y: 240 },
                label: 'Report Setup',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'report-metrics',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'report-config-group',
                color: 'blue',
                icon: 'chart',
              },

              {
                id: 'report-range',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'report-config-group',
                color: 'blue',
                icon: 'activity',
              },

              {
                id: 'report-segment',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'report-config-group',
                color: 'blue',
                icon: 'users',
              },

              {
                id: 'report-engine-group',
                type: 'group',
                position: { x: 520, y: 240 },
                label: 'Report Builder',
                color: colors.slate,
                width: 80,
                height: 220,
              },

              {
                id: 'report-aggregate',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'report-engine-group',
                color: colors.slate,
                icon: 'database',
              },

              {
                id: 'report-visualize',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'report-engine-group',
                color: colors.slate,
                icon: 'chart',
              },

              {
                id: 'report-generate',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'report-engine-group',
                color: colors.slate,
                icon: 'report',
              },

              {
                id: 'report-storage-group',
                type: 'group',
                position: { x: 690, y: 260 },
                label: 'Report History',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'report-database',
                type: 'icon',
                position: { x: 11, y: 20 },
                parentId: 'report-storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'report-files',
                type: 'icon',
                position: { x: 11, y: 88 },
                parentId: 'report-storage-group',
                color: 'pink',
                icon: 'folder',
              },

              {
                id: 'report-output',
                type: 'icon',
                position: { x: 855, y: 315 },
                label: 'Report',
                color: colors.slate,
                icon: 'report',
              },

              {
                id: 'report-browser',
                type: 'browser',
                position: { x: 980, y: 240 },
              },
            ],

            connections: [
              { source: 'report-source', target: 'report-traffic' },
              { source: 'report-source', target: 'report-engagement' },
              { source: 'report-source', target: 'report-conversions' },

              { source: 'report-traffic', target: 'report-metrics' },
              { source: 'report-engagement', target: 'report-range' },
              { source: 'report-conversions', target: 'report-segment' },

              { source: 'report-metrics', target: 'report-aggregate' },
              { source: 'report-range', target: 'report-visualize' },
              { source: 'report-segment', target: 'report-generate' },

              { source: 'report-aggregate', target: 'report-database' },
              { source: 'report-visualize', target: 'report-files' },
              { source: 'report-generate', target: 'report-database' },

              { source: 'report-database', target: 'report-output' },
              { source: 'report-files', target: 'report-output' },

              { source: 'report-output', target: 'report-browser' },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Turn website data into useful signals automatically',
            description:
              'Pathlens continuously analyzes your website activity to surface meaningful changes, unusual behavior and opportunities worth investigating.',
            steps: [
              {
                number: '01',
                title: 'Observe',
                description:
                  'Bring together traffic, engagement, visitor, event and conversion data from across your website.',
              },
              {
                number: '02',
                title: 'Detect',
                description:
                  'Analyze changes and patterns to identify unusual behavior, emerging trends and notable opportunities.',
              },
              {
                number: '03',
                title: 'Explain',
                description:
                  'Turn detected signals into clear insights with the supporting context you need to understand what changed.',
              },
            ],
            visual: 'ai-insights-how-it-works',
          },

          workflow: {
            title: 'Surface the changes worth investigating',
            description:
              'Continuously analyze website activity, detect meaningful trends and anomalies and turn complex behavioral data into clear, actionable insights.',

            nodes: [
              /* ------------------------------------------------------------------ */
              /* ANALYTICS DATA                                                     */
              /* ------------------------------------------------------------------ */

              {
                id: 'ai-source',
                type: 'icon',
                position: {
                  x: 40,
                  y: 210,
                },
                label: 'Website Data',
                color: 'orange',
                icon: 'chart',
              },

              /* ------------------------------------------------------------------ */
              /* DATA INPUTS                                                        */
              /* ------------------------------------------------------------------ */

              {
                id: 'ai-input-group',
                type: 'group',
                position: {
                  x: 180,
                  y: 240,
                },
                label: 'Activity Signals',
                color: colors.violet,
                width: 80,
                height: 220,
              },

              {
                id: 'ai-traffic',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'ai-input-group',
                color: colors.violet,
                icon: 'chart',
              },

              {
                id: 'ai-events',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'ai-input-group',
                color: colors.violet,
                icon: 'activity',
              },

              {
                id: 'ai-conversions',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'ai-input-group',
                color: colors.violet,
                icon: 'target',
              },

              /* ------------------------------------------------------------------ */
              /* SIGNAL PROCESSING                                                  */
              /* ------------------------------------------------------------------ */

              {
                id: 'ai-processing-group',
                type: 'group',
                position: {
                  x: 350,
                  y: 240,
                },
                label: 'Signal Processing',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'ai-normalize',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'ai-processing-group',
                color: 'blue',
                icon: 'database',
              },

              {
                id: 'ai-compare',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'ai-processing-group',
                color: 'blue',
                icon: 'chart',
              },

              {
                id: 'ai-context',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'ai-processing-group',
                color: 'blue',
                icon: 'user',
              },

              /* ------------------------------------------------------------------ */
              /* AI ANALYSIS                                                        */
              /* ------------------------------------------------------------------ */

              {
                id: 'ai-engine-group',
                type: 'group',
                position: {
                  x: 520,
                  y: 240,
                },
                label: 'AI Analysis',
                color: colors.violet,
                width: 80,
                height: 220,
              },

              {
                id: 'ai-trends',
                type: 'icon',
                position: {
                  x: 11,
                  y: 18,
                },
                parentId: 'ai-engine-group',
                color: colors.violet,
                icon: 'trend',
              },

              {
                id: 'ai-anomalies',
                type: 'icon',
                position: {
                  x: 11,
                  y: 82,
                },
                parentId: 'ai-engine-group',
                color: colors.violet,
                icon: 'brain',
              },

              {
                id: 'ai-opportunities',
                type: 'icon',
                position: {
                  x: 11,
                  y: 146,
                },
                parentId: 'ai-engine-group',
                color: colors.violet,
                icon: 'brain',
              },

              /* ------------------------------------------------------------------ */
              /* INSIGHT DATA                                                       */
              /* ------------------------------------------------------------------ */

              {
                id: 'ai-storage-group',
                type: 'group',
                position: {
                  x: 690,
                  y: 260,
                },
                label: 'Insight Data',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'ai-insight-database',
                type: 'icon',
                position: {
                  x: 11,
                  y: 20,
                },
                parentId: 'ai-storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'ai-insight-history',
                type: 'icon',
                position: {
                  x: 11,
                  y: 88,
                },
                parentId: 'ai-storage-group',
                color: 'pink',
                icon: 'folder',
              },

              /* ------------------------------------------------------------------ */
              /* INSIGHTS                                                           */
              /* ------------------------------------------------------------------ */

              {
                id: 'ai-insight-output',
                type: 'icon',
                position: {
                  x: 855,
                  y: 315,
                },
                label: 'AI Insights',
                color: colors.violet,
                icon: 'brain',
              },

              {
                id: 'ai-insights-browser',
                type: 'browser',
                position: {
                  x: 980,
                  y: 240,
                },
              },
            ],

            connections: [
              /* Website data -> Signals */

              {
                source: 'ai-source',
                target: 'ai-traffic',
              },

              {
                source: 'ai-source',
                target: 'ai-events',
              },

              {
                source: 'ai-source',
                target: 'ai-conversions',
              },

              /* Signals -> Processing */

              {
                source: 'ai-traffic',
                target: 'ai-normalize',
              },

              {
                source: 'ai-events',
                target: 'ai-compare',
              },

              {
                source: 'ai-conversions',
                target: 'ai-context',
              },

              /* Processing -> AI */

              {
                source: 'ai-normalize',
                target: 'ai-trends',
              },

              {
                source: 'ai-compare',
                target: 'ai-anomalies',
              },

              {
                source: 'ai-context',
                target: 'ai-opportunities',
              },

              /* AI -> Insight Data */

              {
                source: 'ai-trends',
                target: 'ai-insight-database',
              },

              {
                source: 'ai-anomalies',
                target: 'ai-insight-history',
              },

              {
                source: 'ai-opportunities',
                target: 'ai-insight-database',
              },

              /* Insight Data -> Output */

              {
                source: 'ai-insight-database',
                target: 'ai-insight-output',
              },

              {
                source: 'ai-insight-history',
                target: 'ai-insight-output',
              },

              /* Output -> UI */

              {
                source: 'ai-insight-output',
                target: 'ai-insights-browser',
              },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Understand behavior while protecting visitor privacy',
            description:
              'Pathlens uses anonymous identifiers and privacy controls to collect useful behavioral insights without relying on personally identifying visitor information.',
            steps: [
              {
                number: '01',
                title: 'Anonymize',
                description:
                  'Assign anonymous identifiers so visitor activity can be understood without identifying people by name.',
              },
              {
                number: '02',
                title: 'Protect',
                description:
                  'Mask or exclude sensitive fields and content before behavioral data is stored or replayed.',
              },
              {
                number: '03',
                title: 'Analyze',
                description:
                  'Use privacy-conscious behavioral data to understand journeys, engagement and website performance.',
              },
            ],
            visual: 'privacy-how-it-works',
          },

          workflow: {
            title: 'Privacy built into behavioral analytics',
            description:
              'Anonymize visitor activity, protect sensitive content and preserve the behavioral context needed to understand how people use your website.',

            nodes: [
              {
                id: 'privacy-visitor',
                type: 'icon',
                position: { x: 40, y: 210 },
                label: 'Visitor',
                color: 'orange',
                icon: 'user',
              },

              {
                id: 'privacy-capture-group',
                type: 'group',
                position: { x: 180, y: 240 },
                label: 'Data Capture',
                color: colors.slate,
                width: 80,
                height: 220,
              },

              {
                id: 'privacy-page',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'privacy-capture-group',
                color: colors.slate,
                icon: 'globe',
              },

              {
                id: 'privacy-event',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'privacy-capture-group',
                color: colors.slate,
                icon: 'activity',
              },

              {
                id: 'privacy-session',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'privacy-capture-group',
                color: colors.slate,
                icon: 'user',
              },

              {
                id: 'privacy-protection-group',
                type: 'group',
                position: { x: 350, y: 240 },
                label: 'Privacy Controls',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'privacy-anonymous-id',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'privacy-protection-group',
                color: 'blue',
                icon: 'user',
              },

              {
                id: 'privacy-mask',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'privacy-protection-group',
                color: 'blue',
                icon: 'shield',
              },

              {
                id: 'privacy-filter',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'privacy-protection-group',
                color: 'blue',
                icon: 'shield',
              },

              {
                id: 'privacy-processing-group',
                type: 'group',
                position: { x: 520, y: 240 },
                label: 'Protected Processing',
                color: colors.slate,
                width: 80,
                height: 220,
              },

              {
                id: 'privacy-sanitize',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'privacy-processing-group',
                color: colors.slate,
                icon: 'shield',
              },

              {
                id: 'privacy-context',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'privacy-processing-group',
                color: colors.slate,
                icon: 'globe',
              },

              {
                id: 'privacy-analysis',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'privacy-processing-group',
                color: colors.slate,
                icon: 'shield',
              },

              {
                id: 'privacy-storage-group',
                type: 'group',
                position: { x: 690, y: 260 },
                label: 'Protected Data',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'privacy-database',
                type: 'icon',
                position: { x: 11, y: 20 },
                parentId: 'privacy-storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'privacy-history',
                type: 'icon',
                position: { x: 11, y: 88 },
                parentId: 'privacy-storage-group',
                color: 'pink',
                icon: 'folder',
              },

              {
                id: 'privacy-controls',
                type: 'icon',
                position: { x: 855, y: 315 },
                label: 'Privacy Controls',
                color: colors.slate,
                icon: 'shield',
              },

              {
                id: 'privacy-browser',
                type: 'browser',
                position: { x: 980, y: 240 },
              },
            ],

            connections: [
              { source: 'privacy-visitor', target: 'privacy-page' },
              { source: 'privacy-visitor', target: 'privacy-event' },
              { source: 'privacy-visitor', target: 'privacy-session' },

              { source: 'privacy-page', target: 'privacy-anonymous-id' },
              { source: 'privacy-event', target: 'privacy-mask' },
              { source: 'privacy-session', target: 'privacy-filter' },

              { source: 'privacy-anonymous-id', target: 'privacy-sanitize' },
              { source: 'privacy-mask', target: 'privacy-context' },
              { source: 'privacy-filter', target: 'privacy-analysis' },

              { source: 'privacy-sanitize', target: 'privacy-database' },
              { source: 'privacy-context', target: 'privacy-history' },
              { source: 'privacy-analysis', target: 'privacy-database' },

              { source: 'privacy-database', target: 'privacy-controls' },
              { source: 'privacy-history', target: 'privacy-controls' },

              { source: 'privacy-controls', target: 'privacy-browser' },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Keep projects, websites and teams clearly separated',
            description:
              'Pathlens workspaces give each team a structured place to organize projects, websites, analytics data and access.',
            steps: [
              {
                number: '01',
                title: 'Create',
                description:
                  'Create a workspace for a company, team, client or group of related projects.',
              },
              {
                number: '02',
                title: 'Organize',
                description:
                  'Add websites and projects while keeping analytics data clearly separated.',
              },
              {
                number: '03',
                title: 'Collaborate',
                description:
                  'Invite teammates and manage who can access each workspace and project.',
              },
            ],
            visual: 'workspaces-how-it-works',
          },

          workflow: {
            title: 'Organize people, teams and projects in one workspace',
            description:
              'Create a workspace, invite members, organize them into teams and connect those teams with the projects they work on.',

            nodes: [
              /* ------------------------------------------------------------------ */
              /* WORKSPACE                                                          */
              /* ------------------------------------------------------------------ */

              {
                id: 'workspace',
                type: 'icon',
                position: { x: 100, y: 315 },
                label: 'Workspace',
                color: colors.emerald,
                icon: 'globe',
              },

              /* ------------------------------------------------------------------ */
              /* MEMBERS                                                            */
              /* ------------------------------------------------------------------ */

              {
                id: 'workspace-members-group',
                type: 'group',
                position: { x: 260, y: 240 },
                label: 'Members',
                color: colors.emerald,
                width: 145,
                height: 220,
              },

              {
                id: 'workspace-member-1',
                type: 'icon',
                position: { x: 12, y: 20 },
                parentId: 'workspace-members-group',
                color: colors.emerald,
                icon: 'user',
              },

              {
                id: 'workspace-member-2',
                type: 'icon',
                position: { x: 75, y: 20 },
                parentId: 'workspace-members-group',
                color: colors.emerald,
                icon: 'user',
              },

              {
                id: 'workspace-member-3',
                type: 'icon',
                position: { x: 12, y: 92 },
                parentId: 'workspace-members-group',
                color: colors.emerald,
                icon: 'user',
              },

              {
                id: 'workspace-member-4',
                type: 'icon',
                position: { x: 75, y: 92 },
                parentId: 'workspace-members-group',
                color: colors.emerald,
                icon: 'user',
              },

              /* ------------------------------------------------------------------ */
              /* TEAMS                                                              */
              /* ------------------------------------------------------------------ */

              {
                id: 'workspace-teams-group',
                type: 'group',
                position: { x: 500, y: 260 },
                label: 'Teams',
                color: 'blue',
                width: 145,
                height: 180,
              },

              {
                id: 'workspace-team-1',
                type: 'icon',
                position: { x: 12, y: 28 },
                parentId: 'workspace-teams-group',
                color: 'blue',
                icon: 'users',
              },

              {
                id: 'workspace-team-2',
                type: 'icon',
                position: { x: 75, y: 28 },
                parentId: 'workspace-teams-group',
                color: 'blue',
                icon: 'users',
              },

              {
                id: 'workspace-team-3',
                type: 'icon',
                position: { x: 43, y: 96 },
                parentId: 'workspace-teams-group',
                color: 'blue',
                icon: 'users',
              },

              /* ------------------------------------------------------------------ */
              /* PROJECTS                                                           */
              /* ------------------------------------------------------------------ */

              {
                id: 'workspace-projects-group',
                type: 'group',
                position: { x: 750, y: 240 },
                label: 'Projects',
                color: 'pink',
                width: 145,
                height: 220,
              },

              {
                id: 'workspace-project-1',
                type: 'icon',
                position: { x: 12, y: 20 },
                parentId: 'workspace-projects-group',
                color: 'pink',
                icon: 'folder',
              },

              {
                id: 'workspace-project-2',
                type: 'icon',
                position: { x: 75, y: 20 },
                parentId: 'workspace-projects-group',
                color: 'pink',
                icon: 'folder',
              },

              {
                id: 'workspace-project-3',
                type: 'icon',
                position: { x: 12, y: 92 },
                parentId: 'workspace-projects-group',
                color: 'pink',
                icon: 'folder',
              },

              {
                id: 'workspace-project-4',
                type: 'icon',
                position: { x: 75, y: 92 },
                parentId: 'workspace-projects-group',
                color: 'pink',
                icon: 'folder',
              },

              /* ------------------------------------------------------------------ */
              /* WORKSPACE UI                                                       */
              /* ------------------------------------------------------------------ */

              {
                id: 'workspace-browser',
                type: 'browser',
                position: { x: 1010, y: 235 },
              },
            ],

            connections: [
              /* Workspace -> Members */

              {
                source: 'workspace',
                target: 'workspace-member-1',
              },

              {
                source: 'workspace',
                target: 'workspace-member-2',
              },

              {
                source: 'workspace',
                target: 'workspace-member-3',
              },

              {
                source: 'workspace',
                target: 'workspace-member-4',
              },

              /* Members -> Teams */

              {
                source: 'workspace-member-1',
                target: 'workspace-team-1',
              },

              {
                source: 'workspace-member-2',
                target: 'workspace-team-1',
              },

              {
                source: 'workspace-member-3',
                target: 'workspace-team-2',
              },

              {
                source: 'workspace-member-4',
                target: 'workspace-team-3',
              },

              /* Teams -> Projects */

              {
                source: 'workspace-team-1',
                target: 'workspace-project-1',
              },

              {
                source: 'workspace-team-1',
                target: 'workspace-project-2',
              },

              {
                source: 'workspace-team-2',
                target: 'workspace-project-3',
              },

              {
                source: 'workspace-team-3',
                target: 'workspace-project-4',
              },

              /* Projects -> Workspace UI */

              {
                source: 'workspace-project-1',
                target: 'workspace-browser',
              },

              {
                source: 'workspace-project-2',
                target: 'workspace-browser',
              },

              {
                source: 'workspace-project-3',
                target: 'workspace-browser',
              },

              {
                source: 'workspace-project-4',
                target: 'workspace-browser',
              },
            ],
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

          howItWorks: {
            eyebrow: 'How it works',
            title: 'Control access without making permissions complicated',
            description:
              'Pathlens lets you define reusable roles and permission profiles so every teammate gets exactly the access they need.',
            steps: [
              {
                number: '01',
                title: 'Assign',
                description:
                  'Add teammates to a workspace and assign the appropriate role or permission profile.',
              },
              {
                number: '02',
                title: 'Control',
                description:
                  'Choose what each role can view, edit, manage or export across projects.',
              },
              {
                number: '03',
                title: 'Enforce',
                description:
                  'Apply permissions consistently whenever teammates access workspace features and data.',
              },
            ],
            visual: 'access-control-how-it-works',
          },

          workflow: {
            title: 'Give every teammate the right access',
            description:
              'Assign roles, define reusable permission profiles and control what teammates can view, edit, manage and export across your workspace.',

            nodes: [
              {
                id: 'access-user',
                type: 'icon',
                position: { x: 40, y: 210 },
                label: 'Teammate',
                color: 'orange',
                icon: 'user',
              },

              {
                id: 'access-role-group',
                type: 'group',
                position: { x: 180, y: 240 },
                label: 'Roles',
                color: colors.blue,
                width: 80,
                height: 220,
              },

              {
                id: 'access-viewer',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'access-role-group',
                color: colors.blue,
                icon: 'eye',
              },

              {
                id: 'access-editor',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'access-role-group',
                color: colors.blue,
                icon: 'code',
              },

              {
                id: 'access-admin',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'access-role-group',
                color: colors.blue,
                icon: 'key',
              },

              {
                id: 'permission-group',
                type: 'group',
                position: { x: 350, y: 240 },
                label: 'Permissions',
                color: 'blue',
                width: 80,
                height: 220,
              },

              {
                id: 'permission-view',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'permission-group',
                color: 'blue',
                icon: 'eye',
              },

              {
                id: 'permission-manage',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'permission-group',
                color: 'blue',
                icon: 'key',
              },

              {
                id: 'permission-export',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'permission-group',
                color: 'blue',
                icon: 'report',
              },

              {
                id: 'access-policy-group',
                type: 'group',
                position: { x: 520, y: 240 },
                label: 'Access Policy',
                color: colors.blue,
                width: 80,
                height: 220,
              },

              {
                id: 'policy-check',
                type: 'icon',
                position: { x: 11, y: 18 },
                parentId: 'access-policy-group',
                color: colors.blue,
                icon: 'shield',
              },

              {
                id: 'policy-scope',
                type: 'icon',
                position: { x: 11, y: 82 },
                parentId: 'access-policy-group',
                color: colors.blue,
                icon: 'key',
              },

              {
                id: 'policy-result',
                type: 'icon',
                position: { x: 11, y: 146 },
                parentId: 'access-policy-group',
                color: colors.blue,
                icon: 'shield',
              },

              {
                id: 'access-storage-group',
                type: 'group',
                position: { x: 690, y: 260 },
                label: 'Permission Data',
                color: 'pink',
                width: 80,
                height: 175,
              },

              {
                id: 'access-database',
                type: 'icon',
                position: { x: 11, y: 20 },
                parentId: 'access-storage-group',
                color: 'pink',
                icon: 'database',
              },

              {
                id: 'access-history',
                type: 'icon',
                position: { x: 11, y: 88 },
                parentId: 'access-storage-group',
                color: 'pink',
                icon: 'folder',
              },

              {
                id: 'access-result',
                type: 'icon',
                position: { x: 855, y: 315 },
                label: 'Authorized Access',
                color: colors.blue,
                icon: 'key',
              },

              {
                id: 'access-browser',
                type: 'browser',
                position: { x: 980, y: 240 },
              },
            ],

            connections: [
              { source: 'access-user', target: 'access-viewer' },
              { source: 'access-user', target: 'access-editor' },
              { source: 'access-user', target: 'access-admin' },

              { source: 'access-viewer', target: 'permission-view' },
              { source: 'access-editor', target: 'permission-manage' },
              { source: 'access-admin', target: 'permission-export' },

              { source: 'permission-view', target: 'policy-check' },
              { source: 'permission-manage', target: 'policy-scope' },
              { source: 'permission-export', target: 'policy-result' },

              { source: 'policy-check', target: 'access-database' },
              { source: 'policy-scope', target: 'access-history' },
              { source: 'policy-result', target: 'access-database' },

              { source: 'access-database', target: 'access-result' },
              { source: 'access-history', target: 'access-result' },

              { source: 'access-result', target: 'access-browser' },
            ],
          },
        },
      },
    ],
  },
]
