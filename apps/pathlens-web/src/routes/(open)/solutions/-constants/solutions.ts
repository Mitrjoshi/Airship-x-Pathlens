import {
  BarChart3,
  Bug,
  Building2,
  Code2,
  Gauge,
  HeartHandshake,
  LineChart,
  Megaphone,
  MousePointerClick,
  Palette,
  Rocket,
  Search,
  ShoppingCart,
  Sparkles,
  Target,
  TrendingUp,
  UserCheck,
  Users,
  Zap,
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

export type SolutionSection = (typeof solutionSections)[number]

type SolutionItem = SolutionSection['items'][number]

type SolutionPage = SolutionItem['page']

type AllPageKeys = SolutionPage extends infer Page
  ? Page extends unknown
    ? keyof Page
    : never
  : never

type DynamicSolutionPage = {
  [K in AllPageKeys]?: SolutionPage extends infer Page
    ? Page extends Record<K, infer Value>
      ? Value
      : never
    : never
}

export type SolutionData = Omit<SolutionItem, 'page'> & {
  page: DynamicSolutionPage
}

export const solutionSections = [
  {
    title: 'By Team',
    items: [
      {
        href: '/solutions/product-teams',
        title: 'Product Teams',
        description: 'Turn user behavior into better product decisions',
        icon: BarChart3,
        color: colors.indigo,
        page: {
          hero: {
            title: 'Understand how users experience your product',
            description:
              'See how users navigate, engage with features, encounter friction, and move through your product so your team can make better decisions.',
            primaryAction: 'Start analyzing',
            secondaryAction: 'Explore product insights',
            visual: 'product-dashboard',
          },
        },
      },
      {
        href: '/solutions/growth-teams',
        title: 'Growth Teams',
        description: 'Find friction and unlock conversion opportunities',
        icon: TrendingUp,
        color: colors.emerald,
        page: {
          hero: {
            title: 'Turn user behavior into measurable growth',
            description:
              'Find drop-offs, friction points, and high-impact opportunities across your funnels to improve activation, conversion, and retention.',
            primaryAction: 'Start optimizing',
            secondaryAction: 'Explore growth insights',
            visual: 'growth-dashboard',
          },
        },
      },
      {
        href: '/solutions/marketing-teams',
        title: 'Marketing Teams',
        description: 'See what happens after users click your campaigns',
        icon: Megaphone,
        color: colors.orange,
        page: {
          hero: {
            title: 'See what happens after every campaign click',
            description:
              'Connect traffic sources and campaigns to real user behavior, engagement, journeys, and conversions across your website.',
            primaryAction: 'Track campaigns',
            secondaryAction: 'Explore marketing insights',
            visual: 'marketing-dashboard',
          },
        },
      },
      {
        href: '/solutions/engineering-teams',
        title: 'Engineering Teams',
        description: 'Debug user issues with real session context',
        icon: Code2,
        color: colors.cyan,
        page: {
          hero: {
            title: 'Debug issues with the full user context',
            description:
              'Replay sessions, identify broken experiences, and understand exactly what happened before users encountered an issue.',
            primaryAction: 'Start debugging',
            secondaryAction: 'Explore session replay',
            visual: 'engineering-dashboard',
          },
        },
      },
      {
        href: '/solutions/design-and-ux-teams',
        title: 'Design & UX Teams',
        description: 'Validate experiences using real interaction data',
        icon: Palette,
        color: colors.violet,
        page: {
          hero: {
            title: 'Design with real user behavior in mind',
            description:
              'See where users click, hesitate, struggle, and succeed so you can validate UX decisions using real interaction data.',
            primaryAction: 'Explore user behavior',
            secondaryAction: 'View UX insights',
            visual: 'ux-dashboard',
          },
        },
      },
      {
        href: '/solutions/customer-success',
        title: 'Customer Success',
        description: 'Understand user issues before jumping on a call',
        icon: HeartHandshake,
        color: colors.teal,
        page: {
          hero: {
            title: 'Understand the customer journey before the conversation',
            description:
              'Review user sessions and behavior to quickly understand issues, reduce back-and-forth, and deliver more informed support.',
            primaryAction: 'View customer sessions',
            secondaryAction: 'Explore customer insights',
            visual: 'customer-success-dashboard',
          },
        },
      },
    ],
  },

  {
    title: 'By Goal',
    items: [
      {
        href: '/solutions/improve-conversions',
        title: 'Improve Conversions',
        description: 'Discover where users drop off and why',
        icon: Gauge,
        color: colors.emerald,
        page: {
          hero: {
            title: 'Find what is stopping users from converting',
            description:
              'Understand where users abandon your funnel, what causes friction, and which experiences can be improved to drive more conversions.',
            primaryAction: 'Optimize conversions',
            secondaryAction: 'Explore funnel analytics',
            visual: 'conversion-dashboard',
          },
        },
      },
      {
        href: '/solutions/understand-user-journeys',
        title: 'Understand User Journeys',
        description: 'See how users move through your product',
        icon: LineChart,
        color: colors.blue,
        page: {
          hero: {
            title: 'See every path users take through your product',
            description:
              'Understand how visitors move between pages, features, and key actions so you can uncover common journeys and unexpected paths.',
            primaryAction: 'Explore journeys',
            secondaryAction: 'View behavior analytics',
            visual: 'journey-dashboard',
          },
        },
      },
      {
        href: '/solutions/increase-feature-adoption',
        title: 'Increase Feature Adoption',
        description: 'Learn which features users discover and engage with',
        icon: Sparkles,
        color: colors.violet,
        page: {
          hero: {
            title: 'Understand which features users actually adopt',
            description:
              'Measure feature discovery, usage, and engagement to understand what creates value and where users need a better experience.',
            primaryAction: 'Track feature adoption',
            secondaryAction: 'Explore feature insights',
            visual: 'feature-adoption-dashboard',
          },
        },
      },
      {
        href: '/solutions/reduce-user-friction',
        title: 'Reduce User Friction',
        description: 'Identify rage clicks, dead clicks, and confusing flows',
        icon: MousePointerClick,
        color: colors.amber,
        page: {
          hero: {
            title: 'Find frustrating experiences before users leave',
            description:
              'Identify rage clicks, dead clicks, repeated actions, and confusing journeys that prevent users from completing important tasks.',
            primaryAction: 'Find friction',
            secondaryAction: 'Explore behavior signals',
            visual: 'friction-dashboard',
          },
        },
      },
      {
        href: '/solutions/investigate-bugs',
        title: 'Investigate Bugs',
        description: 'Replay the exact experience behind an issue',
        icon: Bug,
        color: colors.red,
        page: {
          hero: {
            title: 'See exactly what happened before a bug occurred',
            description:
              'Replay real user sessions to reproduce issues, understand their impact, and give engineering teams the context they need.',
            primaryAction: 'Investigate issues',
            secondaryAction: 'Explore session replay',
            visual: 'bug-dashboard',
          },
        },
      },
      {
        href: '/solutions/improve-activation',
        title: 'Improve Activation',
        description: 'Understand what helps new users reach value faster',
        icon: Zap,
        color: colors.orange,
        page: {
          hero: {
            title: 'Help new users reach value faster',
            description:
              'Understand onboarding behavior, identify activation blockers, and see which actions lead users toward their first meaningful outcome.',
            primaryAction: 'Improve activation',
            secondaryAction: 'Explore onboarding insights',
            visual: 'activation-dashboard',
          },
        },
      },
      {
        href: '/solutions/improve-retention',
        title: 'Improve Retention',
        description: 'Find behaviors connected to long-term engagement',
        icon: UserCheck,
        color: colors.teal,
        page: {
          hero: {
            title: 'Understand what keeps users coming back',
            description:
              'Identify behaviors, journeys, and features associated with stronger engagement and use those insights to improve retention.',
            primaryAction: 'Explore retention',
            secondaryAction: 'View engagement insights',
            visual: 'retention-dashboard',
          },
        },
      },
      {
        href: '/solutions/ux-research',
        title: 'UX Research',
        description: 'Discover behavioral patterns without manual research',
        icon: Search,
        color: colors.indigo,
        page: {
          hero: {
            title: 'Discover UX insights from real user behavior',
            description:
              'Observe how users interact with your experience and uncover patterns, usability issues, and opportunities without relying only on interviews.',
            primaryAction: 'Start researching',
            secondaryAction: 'Explore UX analytics',
            visual: 'ux-research-dashboard',
          },
        },
      },
    ],
  },

  {
    title: 'By Industry',
    items: [
      {
        href: '/solutions/saas',
        title: 'SaaS',
        description: 'Optimize onboarding, activation, and retention',
        icon: Rocket,
        color: colors.indigo,
        page: {
          hero: {
            title: 'Understand every stage of your SaaS customer journey',
            description:
              'Analyze onboarding, activation, feature adoption, engagement, and retention to continuously improve your product experience.',
            primaryAction: 'Start tracking',
            secondaryAction: 'Explore SaaS analytics',
            visual: 'saas-dashboard',
          },
        },
      },
      {
        href: '/solutions/e-commerce',
        title: 'E-commerce',
        description: 'Improve product discovery, cart, and checkout journeys',
        icon: ShoppingCart,
        color: colors.emerald,
        page: {
          hero: {
            title: 'Understand what drives shoppers to purchase',
            description:
              'Analyze product discovery, browsing behavior, cart activity, checkout friction, and conversion across the complete shopping journey.',
            primaryAction: 'Optimize your store',
            secondaryAction: 'Explore commerce insights',
            visual: 'ecommerce-dashboard',
          },
        },
      },
      {
        href: '/solutions/startups',
        title: 'Startups',
        description: 'Get actionable insights without a dedicated data team',
        icon: Target,
        color: colors.orange,
        page: {
          hero: {
            title: 'Get the insights you need to build faster',
            description:
              'Understand your users, validate product decisions, and uncover growth opportunities without building a complex analytics stack.',
            primaryAction: 'Start analyzing',
            secondaryAction: 'Explore startup insights',
            visual: 'startup-dashboard',
          },
        },
      },
      {
        href: '/solutions/digital-agencies',
        title: 'Digital Agencies',
        description: 'Understand and improve experiences across client sites',
        icon: Users,
        color: colors.violet,
        page: {
          hero: {
            title: 'Turn client website behavior into actionable insights',
            description:
              'Analyze engagement, journeys, conversions, and friction across client websites and use behavioral data to support your recommendations.',
            primaryAction: 'Analyze client sites',
            secondaryAction: 'Explore agency solutions',
            visual: 'agency-dashboard',
          },
        },
      },
      {
        href: '/solutions/enterprise',
        title: 'Enterprise',
        description: 'Analyze digital experiences across products and teams',
        icon: Building2,
        color: colors.slate,
        page: {
          hero: {
            title: 'Understand digital experiences across your organization',
            description:
              'Bring behavioral insights across products, journeys, and teams into one platform so your organization can make better experience decisions.',
            primaryAction: 'Explore Pathlens',
            secondaryAction: 'View enterprise solutions',
            visual: 'enterprise-dashboard',
          },
        },
      },
    ],
  },
]
