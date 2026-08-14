import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ActivityIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  Eye,
  EyeOff,
  LockKeyholeIcon,
  MousePointerClickIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'

import { ModeToggle } from '@/components/common/mode-toggle'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Button } from '@workspace/ui/components/button'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { useLogin } from '@/mutations/auth'

export const Route = createFileRoute('/(auth)/login')({
  component: RouteComponent,
})

const formSchema = z.object({
  email: z.email(),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
})

function RouteComponent() {
  const [showPassword, setShowPassword] = useState(false)

  const { mutate: loginMutate, isPending: loginPending } = useLogin()

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value: { email, password } }) => {
      loginMutate({ email, password })
    },
  })

  return (
    <main className="bg-background flex min-h-screen flex-col lg:grid lg:h-screen lg:min-h-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(30rem,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 text-white lg:flex lg:h-screen lg:min-h-0 lg:flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 size-[38rem] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="absolute right-[-10rem] bottom-[-8rem] size-[30rem] rounded-full bg-violet-500/30 blur-3xl" />
          <div className="absolute inset-0 [background-image:linear-gradient(oklch(1_0_0/0.12)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.12)_1px,transparent_1px)] [mask-image:linear-gradient(to_bottom,black,transparent_80%)] [background-size:48px_48px] opacity-20" />
        </div>

        <div className="relative z-10 flex flex-1 flex-col px-8 py-6 xl:px-14 xl:py-8">
          <Link
            to="/"
            className="flex w-fit items-center gap-2.5 font-semibold tracking-tight"
          >
            <span className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/20">
              <img
                src="/logo.png"
                alt="PathLens"
                className="landing-logo landing-logo-dark size-full object-contain"
              />
            </span>
            PathLens
          </Link>

          <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-8">
            <div className="mb-5 flex items-center gap-2 text-[10px] font-medium tracking-[0.18em] text-cyan-200/80 uppercase">
              <span className="size-1.5 animate-pulse rounded-full bg-cyan-300" />
              Product intelligence, without the noise
            </div>
            <h1 className="max-w-lg text-3xl leading-[1.02] font-semibold tracking-[-0.06em] xl:text-5xl">
              See the moments that move your product forward.
            </h1>
            <p className="mt-4 max-w-md text-xs leading-5 text-blue-100/65 xl:text-sm">
              PathLens brings your customer journey into focus, so every team
              can make a better next decision.
            </p>

            <div className="relative mt-7">
              <div className="absolute -inset-5 rounded-[2rem] bg-cyan-400/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/55 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded bg-white/10 text-[9px] font-semibold">
                      P
                    </span>
                    <span className="text-xs font-medium text-white/80">
                      Acme / Overview
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Live
                  </span>
                </div>

                <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10">
                  <div className="px-3 py-3">
                    <p className="text-[10px] text-white/45 uppercase">
                      Visitors
                    </p>
                    <p className="mt-1 text-lg font-semibold">24.8k</p>
                    <p className="mt-1 text-[10px] text-emerald-300">+18.4%</p>
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-[10px] text-white/45 uppercase">
                      Sessions
                    </p>
                    <p className="mt-1 text-lg font-semibold">18.2k</p>
                    <p className="mt-1 text-[10px] text-emerald-300">+12.1%</p>
                  </div>
                  <div className="px-3 py-3">
                    <p className="text-[10px] text-white/45 uppercase">
                      Conversion
                    </p>
                    <p className="mt-1 text-lg font-semibold">14.6%</p>
                    <p className="mt-1 text-[10px] text-emerald-300">+4.6%</p>
                  </div>
                </div>

                <div className="p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white/80">
                      Visitor activity
                    </span>
                    <span className="text-cyan-300">+18.4%</span>
                  </div>
                  <div className="relative mt-4 h-24 overflow-hidden rounded-lg bg-gradient-to-b from-blue-500/20 to-transparent p-2">
                    <div className="absolute inset-2 [background-image:linear-gradient(oklch(1_0_0/0.12)_1px,transparent_1px),linear-gradient(90deg,oklch(1_0_0/0.12)_1px,transparent_1px)] [background-size:32px_32px] opacity-30" />
                    <svg
                      className="absolute inset-2 size-[calc(100%-1rem)]"
                      viewBox="0 0 600 180"
                      preserveAspectRatio="none"
                      fill="none"
                      aria-hidden="true"
                    >
                      <defs>
                        <linearGradient
                          id="login-line"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="0"
                        >
                          <stop stopColor="#67e8f9" />
                          <stop offset="0.5" stopColor="#60a5fa" />
                          <stop offset="1" stopColor="#a78bfa" />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 150 C70 145 84 100 150 120 S225 80 290 100 S360 45 420 75 S500 65 600 20"
                        stroke="url(#login-line)"
                        strokeWidth="4"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-white/10 px-4 py-2.5 text-[10px] text-white/55">
                  <MousePointerClickIcon className="size-3.5 text-cyan-300" />
                  <span className="flex-1">Signup completed</span>
                  <span>2s ago</span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-blue-100/55">
              <span className="flex items-center gap-1.5">
                <ShieldCheckIcon className="size-3.5 text-cyan-300" />
                Privacy-first
              </span>
              <span className="flex items-center gap-1.5">
                <ActivityIcon className="size-3.5 text-cyan-300" />
                Real-time signals
              </span>
              <span className="flex items-center gap-1.5">
                <LockKeyholeIcon className="size-3.5 text-cyan-300" />
                Secure workspace
              </span>
            </div>
          </div>

          <p className="text-xs text-blue-100/40">Analytics with intent.</p>
        </div>
      </section>

      <section className="order-2 flex min-h-screen flex-col lg:order-none lg:h-screen lg:min-h-0 lg:overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium lg:hidden"
          >
            <span className="bg-background ring-foreground/10 size-7 overflow-hidden rounded-md ring-1">
              <img
                src="/logo.png"
                alt="PathLens"
                className="landing-logo size-full object-contain"
              />
            </span>
            PathLens
          </Link>
          <Link
            to="/"
            className="text-muted-foreground hover:text-foreground hidden items-center gap-1.5 text-xs transition-colors lg:flex"
          >
            <ArrowLeftIcon className="size-3.5" />
            Back to home
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground hidden text-xs sm:inline">
              Need an account?
            </span>
            <Button variant="ghost" render={<Link to="/sign-up" />}>
              Sign up
            </Button>
            <ModeToggle />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-center px-5 py-10 sm:px-8 sm:py-16 lg:px-10 lg:py-6">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:mb-5">
              <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                Welcome back
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                Log in to your workspace.
              </h2>
              <p className="text-muted-foreground mt-4 text-sm leading-6">
                Enter your credentials to continue where you left off.
              </p>
            </div>

            <form
              id="login-form"
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <FieldGroup className="flex flex-col gap-5 lg:gap-4">
                <form.Field
                  name="email"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="you@example.com"
                          autoComplete="email"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                />
                <form.Field
                  name="password"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <div className="flex items-center justify-between gap-4">
                          <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                          <Link
                            to="/password-reset"
                            search={{ token: undefined }}
                            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                          >
                            Forgot password?
                          </Link>
                        </div>
                        <div className="relative">
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Enter your password"
                            type={showPassword ? 'text' : 'password'}
                            className="pr-10"
                            autoComplete="current-password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute inset-y-0 right-0"
                            onClick={() => setShowPassword((prev) => !prev)}
                            aria-label={
                              showPassword ? 'Hide password' : 'Show password'
                            }
                          >
                            {showPassword ? (
                              <EyeOff className="size-4" />
                            ) : (
                              <Eye className="size-4" />
                            )}
                          </Button>
                        </div>
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                />
              </FieldGroup>
            </form>

            <Button
              disabled={loginPending}
              form="login-form"
              type="submit"
              className="mt-7 w-full lg:mt-5"
              size="lg"
            >
              <LoadingSwap isLoading={loginPending}>Log in</LoadingSwap>
              {!loginPending && <ArrowUpRightIcon />}
            </Button>

            <div className="border-border bg-muted/30 mt-8 rounded-xl border p-4 lg:mt-5 lg:p-3">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  <ShieldCheckIcon className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-medium">
                    Your workspace stays private
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs leading-5">
                    PathLens protects your analytics data by default.
                  </p>
                </div>
                <CheckIcon className="ml-auto size-4 shrink-0 text-emerald-500" />
              </div>
            </div>

            <p className="text-muted-foreground mt-8 text-center text-sm lg:mt-5">
              Don&apos;t have an account?{' '}
              <Link
                to="/sign-up"
                className="text-foreground font-medium hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>

        <footer className="border-border shrink-0 border-t px-5 py-4 sm:px-8 lg:px-10">
          <p className="text-muted-foreground text-center text-xs lg:text-left">
            © 2026 PathLens · Privacy-first analytics.
          </p>
        </footer>
      </section>

      <section className="relative order-1 flex min-h-56 overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-violet-950 px-5 py-8 text-white lg:hidden">
        <div className="pointer-events-none absolute -top-24 right-[-3rem] size-60 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-cyan-200/70 uppercase">
              PathLens
            </p>
            <p className="mt-2 max-w-xs text-xl font-semibold tracking-tight">
              A clearer view of every customer path.
            </p>
          </div>
          <ActivityIcon className="mb-1 size-8 text-cyan-300/80" />
        </div>
      </section>
    </main>
  )
}
