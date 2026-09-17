import {
  Activity,
  BarChart3,
  Bot,
  Brain,
  ChartNoAxesCombined,
  ChartSpline,
  CircleAlert,
  Clock3,
  Code2,
  Compass,
  Crosshair,
  FileBarChart,
  Fingerprint,
  FormInput,
  Globe2,
  HeartPulse,
  Laptop,
  LineChart,
  MousePointerClick,
  Network,
  Play,
  Radio,
  Route,
  ScanSearch,
  ScrollText,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Video,
  Waypoints,
  Zap,
} from 'lucide-react'

export const productSections = [
  {
    title: 'Analytics',
    items: [
      {
        title: 'Product Analytics',
        description: 'Understand how users interact with your product',
        icon: BarChart3,
      },
      {
        title: 'Event Tracking',
        description: 'Track every meaningful user action',
        icon: Activity,
      },
      {
        title: 'User Analytics',
        description: 'Explore individual user behavior',
        icon: Users,
      },
      {
        title: 'Funnels',
        description: 'Find where users convert or drop off',
        icon: TrendingUp,
      },
      {
        title: 'Retention',
        description: 'Measure whether users keep coming back',
        icon: HeartPulse,
      },
      {
        title: 'Cohorts',
        description: 'Group users by behavior and attributes',
        icon: Network,
      },
      {
        title: 'Trends',
        description: 'Track metrics and behavioral changes over time',
        icon: ChartSpline,
      },
      {
        title: 'Custom Reports',
        description: 'Build analytics around the metrics you care about',
        icon: FileBarChart,
      },
    ],
  },

  {
    title: 'Behavior',
    items: [
      {
        title: 'Session Replay',
        description: 'Watch real user sessions',
        icon: Play,
      },
      {
        title: 'Heatmaps',
        description: 'See where users click and scroll',
        icon: Crosshair,
      },
      {
        title: 'User Journeys',
        description: 'Visualize paths users take',
        icon: Route,
      },
      {
        title: 'Click Analytics',
        description: 'Understand what users interact with',
        icon: MousePointerClick,
      },
      {
        title: 'Scroll Analytics',
        description: 'See how far users actually read',
        icon: ScrollText,
      },
      {
        title: 'Form Analytics',
        description: 'Find where users struggle with forms',
        icon: FormInput,
      },
      {
        title: 'Rage Clicks',
        description: 'Detect repeated frustrated interactions',
        icon: Zap,
      },
      {
        title: 'Dead Clicks',
        description: "Find clicks that don't produce an expected action",
        icon: CircleAlert,
      },
    ],
  },

  {
    title: 'Real-time',
    items: [
      {
        title: 'Live Users',
        description: "See who's active right now",
        icon: Radio,
      },
      {
        title: 'Live Sessions',
        description: 'Watch sessions as they happen',
        icon: Video,
      },
      {
        title: 'Live Events',
        description: 'Monitor incoming events',
        icon: Activity,
      },
      {
        title: 'Activity Feed',
        description: 'Follow product activity in real time',
        icon: Clock3,
      },
      {
        title: 'Traffic Monitor',
        description: 'Monitor current traffic patterns',
        icon: LineChart,
      },
    ],
  },

  {
    title: 'Intelligence',
    items: [
      {
        title: 'AI Insights',
        description: 'Automatically discover behavioral patterns',
        icon: Sparkles,
      },
      {
        title: 'Anomaly Detection',
        description: 'Detect unusual changes in metrics',
        icon: ScanSearch,
      },
      {
        title: 'AI Session Summary',
        description: 'Summarize long user sessions',
        icon: Bot,
      },
      {
        title: 'Behavior Predictions',
        description: 'Identify potential conversion patterns',
        icon: Brain,
      },
      {
        title: 'Ask PathLens',
        description: 'Ask questions about your product data',
        icon: Search,
      },
    ],
  },

  {
    title: 'Audience',
    items: [
      {
        title: 'User Segments',
        description: 'Analyze specific groups of users',
        icon: Users,
      },
      {
        title: 'Geography',
        description: 'Understand users by location',
        icon: Globe2,
      },
      {
        title: 'Devices',
        description: 'Compare desktop, mobile and tablet behavior',
        icon: Laptop,
      },
      {
        title: 'Browsers',
        description: 'Analyze browser-specific behavior',
        icon: Code2,
      },
      {
        title: 'New vs Returning',
        description: 'Compare first-time and returning users',
        icon: Fingerprint,
      },
      {
        title: 'Traffic Sources',
        description: 'Understand where users come from',
        icon: Compass,
      },
    ],
  },

  {
    title: 'Optimization',
    items: [
      {
        title: 'Conversion Optimization',
        description: 'Identify opportunities to improve conversion',
        icon: Target,
      },
      {
        title: 'Friction Detection',
        description: 'Find points causing user frustration',
        icon: CircleAlert,
      },
      {
        title: 'Feature Adoption',
        description: 'Measure which features users actually use',
        icon: BarChart3,
      },
      {
        title: 'Path Comparison',
        description: 'Compare different user journeys',
        icon: Waypoints,
      },
      {
        title: 'A/B Analysis',
        description: 'Compare behavior between experiences',
        icon: ChartNoAxesCombined,
      },
    ],
  },
]
