import {
  ProjectPageHeader,
  ProjectPanel,
} from '@/components/common/project-page'
import { WorkspacePageLayout } from '@/components/app-sidebar'
import {
  getPlanDefinition,
  isPlanId,
  setWorkspacePlan,
  useWorkspacePlan,
} from '@/lib/billing'
import { Button } from '@workspace/ui/components/button'
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Badge } from '@workspace/ui/components/badge'
import { Separator } from '@workspace/ui/components/separator'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  Check,
  CreditCard,
  LockKeyhole,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { cn } from '@workspace/ui/lib/utils'

export const Route = createFileRoute('/app/$workspace/checkout/$plan')({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Checkout',
  },
})

function CheckoutStep({
  number,
  label,
  active = false,
  complete = false,
}: {
  number: string
  label: string
  active?: boolean
  complete?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs',
        active ? 'text-foreground font-medium' : 'text-muted-foreground'
      )}
      aria-current={active ? 'step' : undefined}
    >
      <span
        className={cn(
          'flex size-6 items-center justify-center rounded-full border text-[11px] font-medium',
          active && 'border-foreground bg-foreground text-background',
          complete && !active && 'border-foreground/30 bg-muted text-foreground'
        )}
      >
        {complete ? <Check className="size-3.5" /> : number}
      </span>
      <span>{label}</span>
    </div>
  )
}

function formatPrice(price: number): string {
  return price === 0 ? 'Free' : `$${price}`
}

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
      <WorkspacePageLayout workspaceId={workspace}>
        <div className="space-y-8">
          <ProjectPageHeader
            eyebrow="Workspace billing"
            title="Checkout unavailable."
            description="The plan you selected could not be found. Return to billing to choose another plan."
            actions={
              <Button
                variant="outline"
                render={
                  <Link to="/app/$workspace/billing" params={{ workspace }} />
                }
              >
                <ArrowLeft />
                Back to billing
              </Button>
            }
          />
          <ProjectPanel>
            <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
              <p className="text-sm font-medium">Plan not found</p>
              <p className="text-muted-foreground mt-2 max-w-sm text-sm">
                This checkout link is no longer available.
              </p>
            </CardContent>
          </ProjectPanel>
        </div>
      </WorkspacePageLayout>
    )
  }

  const isCurrent = currentPlanId === plan.id
  const cardDigits = cardNumber.replace(/\D/g, '')
  const visibleFeatures = plan.features.slice(0, 8)

  const submitPayment = async (event: FormEvent<HTMLFormElement>) => {
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
    <WorkspacePageLayout workspaceId={workspace}>
      <div className="space-y-8">
        <ProjectPageHeader
          eyebrow="Checkout"
          title={`Switch to ${plan.name}.`}
          description="Review your plan, then confirm the change. This local checkout never sends card details anywhere."
          actions={
            <Button
              variant="outline"
              render={
                <Link to="/app/$workspace/billing" params={{ workspace }} />
              }
            >
              <ArrowLeft />
              Back to billing
            </Button>
          }
        />

        <div className="flex items-center gap-3 border-y py-4 sm:gap-5">
          <CheckoutStep number="1" label="Plan" complete />
          <div className="bg-border h-px flex-1" />
          <CheckoutStep
            number="2"
            label={plan.price === 0 ? 'Confirm' : 'Payment'}
            active
          />
          <div className="bg-border h-px flex-1" />
          <CheckoutStep number="3" label="Updated" />
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(26rem,1.18fr)]">
          <div className="space-y-4">
            <ProjectPanel
              className={cn(
                'flex flex-col',
                plan.highlighted &&
                  'border-foreground/40 ring-foreground/10 ring-1'
              )}
            >
              {plan.highlighted && (
                <div className="bg-foreground text-background px-5 py-1.5 text-[11px] font-medium tracking-[0.16em] uppercase">
                  Recommended for growing teams
                </div>
              )}
              <CardHeader className="border-b px-5 py-5 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{plan.name} plan</CardTitle>
                  {isCurrent ? (
                    <Badge>Current</Badge>
                  ) : plan.highlighted ? (
                    <Badge variant="outline">Popular</Badge>
                  ) : null}
                </div>
                <CardDescription className="mt-2 leading-5">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-[-0.04em]">
                    {formatPrice(plan.price)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {plan.price === 0 ? 'forever' : '/mo'}
                  </span>
                </div>

                <Separator />

                <div>
                  <p className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
                    Included in this plan
                  </p>
                  <ul className="mt-4 space-y-3">
                    {visibleFeatures.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="text-foreground mt-0.5 size-4 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.features.length > visibleFeatures.length && (
                    <p className="text-muted-foreground mt-3 text-xs">
                      + {plan.features.length - visibleFeatures.length} more
                      included features
                    </p>
                  )}
                </div>

                <div className="bg-muted/40 flex items-start gap-3 rounded-xl border p-4">
                  <Sparkles className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <p className="text-muted-foreground text-xs leading-5">
                    {plan.price === 0
                      ? 'Start collecting the essentials with no payment required.'
                      : 'Unlock more room to understand what visitors do and why.'}
                  </p>
                </div>
              </CardContent>
            </ProjectPanel>

            <div className="text-muted-foreground flex items-start gap-2 px-1 text-xs leading-5">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
              <p>
                This is a local simulation. No real charge is created and no
                card data leaves this browser.
              </p>
            </div>
          </div>

          <ProjectPanel>
            <form onSubmit={submitPayment}>
              <CardHeader className="border-b px-5 py-5 sm:px-6">
                <div className="flex items-start gap-3">
                  <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                    {plan.price > 0 ? (
                      <CreditCard className="size-4" />
                    ) : (
                      <Check className="size-4" />
                    )}
                  </span>
                  <div>
                    <CardTitle>
                      {isCurrent
                        ? 'Already on this plan'
                        : plan.price === 0
                          ? 'Confirm your change'
                          : 'Payment details'}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {isCurrent
                        ? 'This workspace is already using this plan.'
                        : plan.price === 0
                          ? 'Confirm the downgrade to move your workspace to Starter.'
                          : 'Use the prefilled test card to simulate payment.'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-5 p-5 sm:p-6">
                {isCurrent ? (
                  <div className="bg-muted/40 flex items-start gap-3 rounded-xl border p-4 text-sm">
                    <ShieldCheck className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <p className="text-muted-foreground leading-5">
                      No payment is needed because this is your current plan.
                    </p>
                  </div>
                ) : plan.price === 0 ? (
                  <div className="bg-muted/40 flex items-start gap-3 rounded-xl border p-4 text-sm">
                    <ShieldCheck className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                    <p className="text-muted-foreground leading-5">
                      Starter is free. Confirm the change to downgrade this
                      workspace.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="bg-foreground text-background relative overflow-hidden rounded-2xl p-5">
                      <div className="border-background/20 absolute -top-14 -right-10 size-36 rounded-full border" />
                      <div className="border-background/20 absolute -right-3 -bottom-20 size-40 rounded-full border" />
                      <div className="relative flex items-center justify-between">
                        <span className="text-[11px] font-medium tracking-[0.2em] uppercase">
                          PathLens
                        </span>
                        <CreditCard className="size-5" />
                      </div>
                      <p className="relative mt-9 font-mono text-lg tracking-[0.18em]">
                        •••• •••• •••• {cardDigits.slice(-4).padStart(4, '•')}
                      </p>
                      <div className="relative mt-6 flex items-end justify-between gap-4 text-[10px] tracking-[0.14em] uppercase opacity-70">
                        <span>Test card</span>
                        <span>{expiry || '08/28'}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="card-number">Card number</Label>
                      <Input
                        id="card-number"
                        inputMode="numeric"
                        autoComplete="cc-number"
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
                          autoComplete="cc-exp"
                          placeholder="MM/YY"
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
                          autoComplete="cc-csc"
                          placeholder="123"
                          value={cvc}
                          onChange={(event) => setCvc(event.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-muted/30 space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Plan subtotal</span>
                    <span className="font-medium">
                      {formatPrice(plan.price)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Billing cycle</span>
                    <span className="font-medium">
                      {plan.price === 0 ? 'No payment' : 'Monthly'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t pt-3">
                    <span className="font-medium">Due today</span>
                    <span className="text-lg font-semibold tracking-tight">
                      {plan.price === 0 ? 'Free' : `$${plan.price.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex-col items-stretch gap-3 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-muted-foreground flex items-center gap-2 text-xs">
                  <LockKeyhole className="size-3.5" />
                  Dummy payment only
                </p>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={isCurrent || isProcessing}
                >
                  {isProcessing && <Loader2 className="animate-spin" />}
                  {isProcessing
                    ? 'Processing...'
                    : isCurrent
                      ? 'Current plan'
                      : plan.price === 0
                        ? 'Confirm Starter'
                        : `Pay $${plan.price}`}
                </Button>
              </CardFooter>
            </form>
          </ProjectPanel>
        </div>
      </div>
    </WorkspacePageLayout>
  )
}
