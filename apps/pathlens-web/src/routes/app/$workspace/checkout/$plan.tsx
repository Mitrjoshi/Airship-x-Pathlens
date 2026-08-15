import {
  ProjectPageHeader,
  ProjectPageLayout,
} from '@/components/common/project-page'
import {
  getPlanDefinition,
  isPlanId,
  setWorkspacePlan,
  useWorkspacePlan,
} from '@/lib/billing'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Check, CreditCard, Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/app/$workspace/checkout/$plan')({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Checkout',
  },
})

function RouteComponent() {
  const { workspace, plan: planParam } = Route.useParams()
  const navigate = useNavigate()
  const currentPlanId = useWorkspacePlan(workspace)
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242')
  const [expiry, setExpiry] = useState('08/28')
  const [cvc, setCvc] = useState('123')
  const [isProcessing, setIsProcessing] = useState(false)
  const plan = isPlanId(planParam) ? getPlanDefinition(planParam) : null

  if (!plan) {
    return (
      <ProjectPageLayout>
        <Card>
          <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
            <p className="text-destructive text-sm">Plan not found.</p>
            <Button
              className="mt-5"
              render={
                <Link to="/app/$workspace/billing" params={{ workspace }} />
              }
            >
              Back to billing
            </Button>
          </CardContent>
        </Card>
      </ProjectPageLayout>
    )
  }

  const isCurrent = currentPlanId === plan.id

  const submitPayment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isCurrent) return

    setIsProcessing(true)
    await new Promise((resolve) => setTimeout(resolve, 900))
    setWorkspacePlan(workspace, plan.id)
    await navigate({
      to: '/app/$workspace/billing',
      params: { workspace },
    })
  }

  return (
    <ProjectPageLayout>
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <ProjectPageHeader
          eyebrow="Dummy checkout"
          title={`Switch to ${plan.name}.`}
          description="This is a local payment simulation. No card details are sent anywhere."
          actions={
            <Button
              variant="outline"
              render={
                <Link to="/app/$workspace/billing" params={{ workspace }} />
              }
            >
              Cancel
            </Button>
          }
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(24rem,1.15fr)]">
          <Card className="h-fit py-0">
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>{plan.name} plan</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight">
                  {plan.price === 0 ? 'Free' : `$${plan.price}`}
                </span>
                {plan.price > 0 && (
                  <span className="text-muted-foreground text-sm">/mo</span>
                )}
              </div>
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <Check className="text-primary mt-0.5 size-4 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="py-0">
            <form onSubmit={submitPayment}>
              <CardHeader className="border-b px-5 py-5">
                <CardTitle>
                  {isCurrent ? 'Current plan' : 'Payment details'}
                </CardTitle>
                <CardDescription>
                  {isCurrent
                    ? 'This workspace is already using this plan.'
                    : 'Use the prefilled test card to simulate payment.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 p-5">
                {isCurrent ? (
                  <div className="bg-muted/40 flex items-start gap-3 rounded-xl border p-4 text-sm">
                    <ShieldCheck className="text-primary mt-0.5 size-4 shrink-0" />
                    <p className="text-muted-foreground">
                      No payment is needed because this is your current plan.
                    </p>
                  </div>
                ) : plan.price === 0 ? (
                  <div className="bg-muted/40 flex items-start gap-3 rounded-xl border p-4 text-sm">
                    <ShieldCheck className="text-primary mt-0.5 size-4 shrink-0" />
                    <p className="text-muted-foreground">
                      Starter is free. Confirm the change to downgrade this
                      workspace.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="card-number">Card number</Label>
                      <Input
                        id="card-number"
                        inputMode="numeric"
                        value={cardNumber}
                        onChange={(event) => setCardNumber(event.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="card-expiry">Expiry</Label>
                        <Input
                          id="card-expiry"
                          value={expiry}
                          onChange={(event) => setExpiry(event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="card-cvc">CVC</Label>
                        <Input
                          id="card-cvc"
                          inputMode="numeric"
                          value={cvc}
                          onChange={(event) => setCvc(event.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="justify-between gap-3 border-t px-5 py-4">
                <p className="text-muted-foreground flex items-center gap-2 text-xs">
                  <CreditCard className="size-3.5" />
                  Dummy payment only
                </p>
                <Button type="submit" disabled={isCurrent || isProcessing}>
                  {isProcessing && <Loader2 className="animate-spin" />}
                  {isProcessing
                    ? 'Processing...'
                    : plan.price === 0
                      ? 'Confirm Starter'
                      : `Pay $${plan.price}`}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </ProjectPageLayout>
  )
}
