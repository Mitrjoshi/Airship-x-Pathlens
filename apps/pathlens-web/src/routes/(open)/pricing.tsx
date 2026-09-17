import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from './-components/home-layout'
import { Button } from '@workspace/ui/components/button'
import { Separator } from '@workspace/ui/components/separator'

export const Route = createFileRoute('/(open)/pricing')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <HomeLayout>
      <div className="mx-auto space-y-10">
        <div className="mx-auto w-fit space-y-2 py-20">
          <h1 className="text-5xl font-medium">
            One payment. Lifetime access.
          </h1>
          <p className="text-muted-foreground text-center">
            Get everything you need to understand your users, forever.
          </p>
        </div>

        <div className="mx-auto grid max-w-[50%] grid-cols-2 gap-4">
          <PricingCard />
          <PricingCard />
        </div>
      </div>
    </HomeLayout>
  )
}

export const PricingCard = () => {
  return (
    <div className="bg-card group hover:border-primary border-border space-y-8 rounded-lg border p-4 duration-200">
      <div>
        <p className="text-2xl">Lifetime Plan</p>
        <p className="text-muted-foreground">
          For mission-critical applications that are core to your business.
        </p>
      </div>
      <p className="font-medium">₹499</p>
      <Button
        className={
          'group-hover:border-primary hover:bg-primary hover:text-background group-hover:text-primary text-foreground bg-secondary w-full border duration-200'
        }
        size={'lg'}
      >
        Get Started
      </Button>
    </div>
  )
}
