import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { SearchIcon } from 'lucide-react'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/integrations/'
)({
  component: RouteComponent,
})

const integrations = [
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description:
      'Connect Google Analytics to understand traffic sources, user acquisition, engagement, and conversions.',
    category: 'Analytics',
    icon: 'https://www.google.com/s2/favicons?domain=analytics.google.com&sz=128',
    status: 'available',
  },
  {
    id: 'google-search-console',
    name: 'Google Search Console',
    description:
      'Monitor search performance, organic traffic, keyword rankings, impressions, and clicks.',
    category: 'Analytics',
    icon: 'https://www.google.com/s2/favicons?domain=search.google.com&sz=128',
    status: 'available',
  },
  {
    id: 'google-ads',
    name: 'Google Ads',
    description:
      'Connect advertising campaigns to track traffic quality, conversions, and campaign performance.',
    category: 'Marketing',
    icon: 'https://www.google.com/s2/favicons?domain=ads.google.com&sz=128',
    status: 'available',
  },
  {
    id: 'slack',
    name: 'Slack',
    description:
      'Receive real-time notifications, performance alerts, and important analytics updates in your workspace.',
    category: 'Notifications',
    icon: 'https://www.google.com/s2/favicons?domain=slack.com&sz=128',
    status: 'available',
  },
  {
    id: 'discord',
    name: 'Discord',
    description:
      'Send analytics reports, monitoring alerts, and project updates directly to your Discord channels.',
    category: 'Notifications',
    icon: 'https://www.google.com/s2/favicons?domain=discord.com&sz=128',
    status: 'available',
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description:
      'Connect payment activity with user behavior to understand revenue, purchases, and conversions.',
    category: 'Payments',
    icon: 'https://www.google.com/s2/favicons?domain=stripe.com&sz=128',
    status: 'coming-soon',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description:
      'Analyze customer journeys, product interactions, checkout behavior, and store conversions.',
    category: 'E-commerce',
    icon: 'https://www.google.com/s2/favicons?domain=shopify.com&sz=128',
    status: 'coming-soon',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    description:
      'Connect website activity with your CRM to understand lead generation and customer journeys.',
    category: 'CRM',
    icon: 'https://www.google.com/s2/favicons?domain=hubspot.com&sz=128',
    status: 'coming-soon',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description:
      'Automate workflows by connecting Pathlens events and insights with thousands of other applications.',
    category: 'Automation',
    icon: 'https://www.google.com/s2/favicons?domain=zapier.com&sz=128',
    status: 'coming-soon',
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description:
      'Send real-time event notifications to external endpoints and build custom integrations.',
    category: 'Developer Tools',
    icon: 'https://www.google.com/s2/favicons?domain=webhook.site&sz=128',
    status: 'available',
  },
] as const

type Integration = (typeof integrations)[number]

function RouteComponent() {
  return (
    <div>
      <div className="mx-auto space-y-4 p-6">
        <div>
          <p className="text-xl font-medium">Integrations</p>
          <p className="text-muted-foreground text-sm">
            Connect your favorite tools to extend Pathlens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <InputGroup className="w-120">
            <InputGroupButton>
              <SearchIcon />
            </InputGroupButton>

            <InputGroupInput placeholder="Search..." />
          </InputGroup>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {integrations.map((integration) => (
            <Card className="bg-card/30 hover:bg-card/60 cursor-pointer rounded-none border-2 border-dashed duration-200">
              <CardContent className="p-0">
                <CardHeader>
                  <Avatar size="lg">
                    <AvatarImage src={integration.icon} />
                    <AvatarFallback>
                      {integration.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="mt-2">{integration.name}</CardTitle>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
