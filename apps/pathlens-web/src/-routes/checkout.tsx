import { Link, createFileRoute } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from 'lucide-react'

import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'

export const Route = createFileRoute('/checkout')({
  validateSearch: (search: Record<string, unknown>) => ({
    checkout:
      search.checkout === 'success' || search.checkout === 'cancelled'
        ? search.checkout
        : undefined,
  }),
  component: CheckoutResultPage,
})

function CheckoutResultPage() {
  const { checkout } = Route.useSearch()
  const isSuccess = checkout === 'success'
  const isCancelled = checkout === 'cancelled'
  const isUnknown = !isSuccess && !isCancelled

  const title = isSuccess
    ? 'Your account is on its way to unlimited possibilities.'
    : isCancelled
      ? 'No worries. Your workspace is still here.'
      : 'We could not read your checkout status.'

  const description = isSuccess
    ? 'Your payment was submitted successfully. Stripe will confirm it shortly, then lifetime account access will be enabled.'
    : isCancelled
      ? 'Your payment was cancelled and no charge was made. You can return to billing whenever you are ready.'
      : 'Return to your workspace to check your current account access or start checkout again.'

  return (
    <main className="bg-background relative flex min-h-svh items-center justify-center overflow-hidden px-5 py-8 sm:px-8 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,oklch(0.78_0.16_205/0.2),transparent_30%),radial-gradient(circle_at_85%_85%,oklch(0.7_0.18_285/0.18),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(oklch(0.5_0_0/0.06)_1px,transparent_1px),linear-gradient(90deg,oklch(0.5_0_0/0.06)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_80%)] [background-size:42px_42px] opacity-40" />

      <div className="relative w-full max-w-4xl">
        <header className="mb-8 flex items-center justify-between px-1 sm:mb-10">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="bg-background flex size-9 items-center justify-center overflow-hidden rounded-xl border shadow-sm">
              <img
                src="/logo.png"
                alt="PathLens"
                className="size-full object-contain"
              />
            </span>
            <span className="text-sm font-semibold tracking-tight">
              PathLens
            </span>
          </Link>
          <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1">
            <ShieldCheckIcon className="size-3.5" />
            Secure checkout
          </Badge>
        </header>

        <Card className="overflow-hidden rounded-[1.75rem] border shadow-2xl shadow-blue-950/10 dark:shadow-black/30">
          <div
            className={`h-1.5 ${
              isSuccess
                ? 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500'
                : 'bg-gradient-to-r from-slate-400 via-blue-400 to-violet-500'
            }`}
          />
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <CardHeader className="px-6 py-8 sm:px-10 sm:py-10 lg:border-r lg:py-12">
              <div
                className={`flex size-16 items-center justify-center rounded-[1.25rem] shadow-sm ${
                  isSuccess
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-300'
                }`}
              >
                {isSuccess ? (
                  <CheckCircle2Icon className="size-8" />
                ) : (
                  <RotateCcwIcon className="size-8" />
                )}
              </div>
              <p className="text-muted-foreground mt-8 flex items-center gap-2 text-xs font-medium tracking-[0.18em] uppercase">
                <SparklesIcon className="size-3.5" />
                Lifetime account access
              </p>
              <CardTitle className="mt-3 max-w-xl text-4xl leading-[1.05] tracking-[-0.06em] sm:text-5xl">
                {title}
              </CardTitle>
              <CardDescription className="mt-5 max-w-lg text-sm leading-7 sm:text-base">
                {description}
              </CardDescription>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" render={<Link to="/app" />}>
                  Go to workspace
                  <ArrowRightIcon />
                </Button>
                {(isCancelled || isUnknown) && (
                  <Button
                    size="lg"
                    variant="outline"
                    render={<Link to="/app/billing" />}
                  >
                    Open billing
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="bg-muted/20 flex flex-col justify-between gap-8 px-6 py-8 sm:px-10 sm:py-10">
              <div>
                <p className="text-muted-foreground text-xs font-medium tracking-[0.16em] uppercase">
                  What happens next
                </p>
                <div className="mt-5 space-y-5">
                  <div className="flex gap-3">
                    <span className="bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold">
                      01
                    </span>
                    <div>
                      <p className="text-sm font-medium">Account access</p>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        {isSuccess
                          ? 'Stripe confirms the payment through a secure webhook.'
                          : 'Your account remains unchanged until a payment is confirmed.'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold">
                      02
                    </span>
                    <div>
                      <p className="text-sm font-medium">More workspaces</p>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        Create additional workspaces from your workspace hub.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="bg-background text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold">
                      03
                    </span>
                    <div>
                      <p className="text-sm font-medium">Independent limits</p>
                      <p className="text-muted-foreground mt-1 text-xs leading-5">
                        Usage limits and status continue to apply per workspace.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-5">
                <p className="text-muted-foreground flex items-start gap-2 text-xs leading-5">
                  <CreditCardIcon className="mt-0.5 size-3.5 shrink-0" />
                  {isSuccess
                    ? 'Access may take a moment to appear while the payment confirmation is processed.'
                    : 'You can safely close this page and return to billing later.'}
                </p>
              </div>
            </CardContent>
          </div>
        </Card>

        <p className="text-muted-foreground mt-6 text-center text-xs">
          Need help? Return to your workspace and open billing from the account
          menu.
        </p>
      </div>
    </main>
  )
}
