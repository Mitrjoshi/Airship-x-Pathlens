import { AuthHeader } from '@/components/common/auth-header'
import { Button } from '@workspace/ui/components/button'
import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/password-reset')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <main className="bg-background min-h-svh">
      <AuthHeader />
      <div className="mx-auto flex w-full max-w-5xl justify-center px-5 py-16 sm:px-8 sm:py-24">
        <section className="w-full max-w-md">
          <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
            Account access
          </p>
          <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-[-0.04em] sm:text-4xl">
            Reset your password.
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Password reset is not available yet. Return to sign in to continue.
          </p>
          <Button className="mt-8" render={<Link to="/login" />}>
            Back to login
          </Button>
        </section>
      </div>
    </main>
  )
}
