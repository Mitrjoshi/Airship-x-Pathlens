import {
  BarChart3,
  Bug,
  Code2,
  Compass,
  Gauge,
  LineChart,
  Megaphone,
  Palette,
  Rocket,
  Search,
  ShoppingCart,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'

export const solutionSections = [
  {
    title: 'By Team',
    items: [
      {
        title: 'Product Teams',
        description: 'Understand users and build better products',
        icon: BarChart3,
      },
      {
        title: 'Growth Teams',
        description: 'Find opportunities to improve conversion',
        icon: Target,
      },
      {
        title: 'Marketing Teams',
        description: 'Connect campaigns to real user behavior',
        icon: Megaphone,
      },
      {
        title: 'Engineering Teams',
        description: 'Detect bugs, friction, and broken experiences',
        icon: Code2,
      },
      {
        title: 'Design Teams',
        description: 'See how users interact with every experience',
        icon: Palette,
      },
      {
        title: 'Customer Success',
        description: 'Investigate user issues with session data',
        icon: Users,
      },
    ],
  },

  {
    title: 'By Use Case',
    items: [
      {
        title: 'Conversion Optimization',
        description: 'Find and fix funnel drop-offs',
        icon: Gauge,
      },
      {
        title: 'User Behavior',
        description: 'Understand how people use your product',
        icon: LineChart,
      },
      {
        title: 'Feature Adoption',
        description: 'Measure which features actually get used',
        icon: Sparkles,
      },
      {
        title: 'UX Research',
        description: 'Discover patterns from real user behavior',
        icon: Search,
      },
      {
        title: 'Bug Investigation',
        description: 'Reproduce issues through session replay',
        icon: Bug,
      },
      {
        title: 'Product Discovery',
        description: 'Turn behavioral data into product insights',
        icon: Compass,
      },
    ],
  },

  {
    title: 'By Business',
    items: [
      {
        title: 'SaaS',
        description: 'Understand activation, engagement, and retention',
        icon: Rocket,
      },
      {
        title: 'E-commerce',
        description: 'Optimize shopping journeys and checkout',
        icon: ShoppingCart,
      },
      {
        title: 'Startups',
        description: 'Get product insights without a large analytics team',
        icon: Rocket,
      },
      {
        title: 'Agencies',
        description: 'Analyze multiple client websites from one platform',
        icon: Users,
      },
      {
        title: 'Enterprise',
        description: 'Centralize product behavior analytics at scale',
        icon: BarChart3,
      },
    ],
  },
]
