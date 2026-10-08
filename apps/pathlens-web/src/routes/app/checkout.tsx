import { useLifetimeCheckout } from '@/mutations/billing'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { ArrowRightIcon } from 'lucide-react'
import { z } from 'zod'
import { CheckoutStateCard } from './-components/checkout/checkout-state-card'
import { BrokenCard } from './-components/checkout/broken-card'
import { PaymentSuccess } from './-components/checkout/payment-success'

export const Route = createFileRoute('/app/checkout')({
  component: RouteComponent,
  validateSearch: z.object({
    checkout: z.enum(['success', 'cancelled']).default('cancelled'),
  }),
})

function RouteComponent() {
  const { checkout } = Route.useSearch()

  const { mutate, isPending } = useLifetimeCheckout()

  if (checkout === 'success') {
    return (
      <CheckoutStateCard
        eyebrow="Payment successful"
        title={
          <>
            Welcome to
            <br />
            <span className="text-muted-foreground">
              unlimited possibilities.
            </span>
          </>
        }
        description="Your lifetime access is confirmed. Your PathLens account is now ready for everything you want to build."
        illustration={<PaymentSuccess />}
        actions={
          <Button size="lg" render={<Link to="/app" replace />}>
            Continue to dashboard
            <ArrowRightIcon />
          </Button>
        }
      />
    )
  }

  return (
    <CheckoutStateCard
      eyebrow="Checkout cancelled"
      title={
        <>
          Something went
          <br />
          <span className="text-muted-foreground">wrong.</span>
        </>
      }
      description="Your checkout session was cancelled and you haven’t been charged. Nothing was lost. You can pick up right where you left off."
      illustration={<BrokenCard />}
      actions={
        <>
          <Button
            size="lg"
            className="group"
            onClick={() => mutate()}
            disabled={isPending}
          >
            <LoadingSwap
              className="flex items-center gap-2"
              isLoading={isPending}
            >
              Retry payment
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </LoadingSwap>
          </Button>

          <Button size="lg" variant="ghost" render={<Link to="/app" replace />}>
            Back to dashboard
          </Button>
        </>
      }
    />
  )
}
