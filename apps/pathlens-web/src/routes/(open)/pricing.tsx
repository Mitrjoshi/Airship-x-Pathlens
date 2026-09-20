import { createFileRoute, Link } from '@tanstack/react-router'
import { HomeLayout } from './-components/home-layout'
import { Button } from '@workspace/ui/components/button'
import { DotLayout } from './-components/dot-layout'

export const Route = createFileRoute('/(open)/pricing')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <HomeLayout>
      <DotLayout className="border-x-2 border-dashed">
        <div className="bg-background mx-auto w-[75%] space-y-20 border-x-2 border-dashed py-20">
          <div className="mx-auto w-fit space-y-2">
            <h1 className="text-5xl font-medium">Pathlens Pricing</h1>
            <p className="text-muted-foreground text-center">
              One payment. Lifetime access.
            </p>
          </div>

          <div className="nut-all mx-auto grid max-w-[75%] grid-cols-2 divide-x-2 divide-dashed border-2 border-dashed">
            <div className="nut-top-right">
              <PricingCard
                plan="FREE"
                price={0}
                description="Build and learn free with no time limits and no credit card required."
                limits={[
                  {
                    label: 'Events',
                    value: '100K',
                  },
                  {
                    label: 'Page Views',
                    value: '10K',
                  },
                  {
                    label: 'Session Recordings',
                    value: '100',
                  },
                  {
                    label: 'Funnels',
                    value: '3',
                  },
                  {
                    label: 'Goals',
                    value: '3',
                  },
                  {
                    label: 'Heatmaps',
                    value: '5',
                  },
                  {
                    label: 'Workspaces',
                    value: '1',
                  },
                  {
                    label: 'Projects',
                    value: '5',
                  },
                  {
                    label: 'Team Members',
                    value: '0',
                  },
                  {
                    label: '',
                    value:
                      'User privacy comes first. All user inputs are masked by default, helping you understand user behavior without exposing sensitive information.',
                  },
                ]}
              />
            </div>

            <div className="nut-bottom-left">
              <PricingCard
                best
                plan="UNLIMITED"
                price={499}
                description="More users, more recordings, and advanced analytics to understand and improve user behavior."
                limits={[
                  {
                    label: 'Events',
                    value: 'Unlimited',
                  },
                  {
                    label: 'Page Views',
                    value: 'Unlimited',
                  },
                  {
                    label: 'Session Recordings',
                    value: 'Unlimited',
                  },
                  {
                    label: 'Funnels',
                    value: 'Unlimited',
                  },
                  {
                    label: 'Goals',
                    value: 'Unlimited',
                  },
                  {
                    label: 'Heatmaps',
                    value: 'Unlimited',
                  },
                  {
                    label: 'Workspaces',
                    value: 'Unlimited',
                  },
                  {
                    label: 'Projects',
                    value: 'Unlimited',
                  },
                  {
                    label: 'Team Members',
                    value: 'Unlimited',
                  },
                  {
                    label: '',
                    value:
                      'User privacy comes first. All user inputs are masked by default, helping you understand user behavior without exposing sensitive information.',
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </DotLayout>
    </HomeLayout>
  )
}

export const PricingCard = ({
  plan,
  price,
  description,
  best,
  limits,
}: {
  plan: string
  price: number
  description: string
  best?: boolean
  limits: {
    label: string
    value: string
  }[]
}) => {
  return (
    <div className="space-y-5 p-5">
      <p
        className={`${best ? 'text-primary' : 'text-muted-foreground'} text-sm`}
      >
        {plan}
      </p>

      <p className="text-3xl font-medium">₹{price}</p>

      <p className="text-muted-foreground">{description}</p>

      <Link to="/login" className="block">
        <Button
          variant={!best ? 'outline' : 'default'}
          className="w-full"
          size="lg"
        >
          Try Now
        </Button>
      </Link>

      <div className="border-t py-5">
        <p className="mb-3 text-sm font-medium">Limits</p>

        <ul className="space-y-4">
          {limits.map((limit) => (
            <li
              key={limit.label}
              className="text-muted-foreground flex items-start gap-4"
            >
              <span
                className={`${best ? 'bg-primary' : 'bg-muted-foreground'} mt-1 h-2 w-2 shrink-0`}
              />

              <p className="text-foreground">
                {limit.value} <span>{limit.label}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
