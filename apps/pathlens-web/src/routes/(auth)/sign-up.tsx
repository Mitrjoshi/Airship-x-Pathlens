import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ActivityIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  Eye,
  EyeOff,
  Layers3Icon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
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
import { useSignUp } from '@/mutations/auth'

export const Route = createFileRoute('/(auth)/sign-up')({
  component: RouteComponent,
})

const formSchema = z
  .object({
    name: z.string().min(1, 'Name is required.'),
    email: z.email(),
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

function RouteComponent() {
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const { mutate: signUpMutate, isPending: signUpPending } = useSignUp()

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value: { confirmPassword, email, password, name } }) => {
      signUpMutate({
        confirmPassword,
        email,
        password,
        name,
      })
    },
  })

  return (
    <main className="bg-background flex min-h-screen flex-col lg:grid lg:h-screen lg:min-h-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(30rem,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 to-cyan-950 text-white lg:flex lg:h-screen lg:min-h-0 lg:flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-[-8rem] size-[38rem] rounded-full bg-violet-400/20 blur-3xl" />
          <div className="absolute bottom-[-10rem] left-[-8rem] size-[32rem] rounded-full bg-cyan-400/20 blur-3xl" />
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
            <div className="mb-5 flex items-center gap-2 text-[10px] font-medium tracking-[0.18em] text-violet-200/80 uppercase">
              <SparklesIcon className="size-3.5 text-violet-300" />A better way
              to understand your product
            </div>
            <h1 className="max-w-lg text-3xl leading-[1.02] font-semibold tracking-[-0.06em] xl:text-5xl">
              Start with a clearer picture.
            </h1>
            <p className="mt-4 max-w-md text-xs leading-5 text-indigo-100/65 xl:text-sm">
              Create your workspace, connect your site, and turn real customer
              behavior into your team&apos;s next best move.
            </p>

            <div className="relative mt-7">
              <div className="absolute -inset-5 rounded-[2rem] bg-violet-400/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/55 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded bg-white/10 text-[9px] font-semibold">
                      P
                    </span>
                    <span className="text-xs font-medium text-white/80">
                      Workspace setup
                    </span>
                  </div>
                  <span className="text-[10px] text-violet-200/70">1 of 3</span>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-3 rounded-xl border border-emerald-300/20 bg-emerald-300/5 p-3">
                    <span className="flex size-7 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                      <CheckIcon className="size-3.5" />
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-medium">
                        Create your workspace
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/45">
                        Your team&apos;s home for product signals
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-300">Done</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-violet-300/30 bg-violet-300/10 p-3 shadow-lg shadow-violet-950/20">
                    <span className="flex size-7 items-center justify-center rounded-full bg-violet-400 text-xs font-semibold text-slate-950">
                      2
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-medium">Install the tracker</p>
                      <p className="mt-0.5 text-[10px] text-white/45">
                        Start collecting data in minutes
                      </p>
                    </div>
                    <ArrowUpRightIcon className="size-4 text-violet-300" />
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="flex size-7 items-center justify-center rounded-full border border-white/20 text-xs text-white/50">
                      3
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-white/65">
                        Invite your team
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/35">
                        Make decisions together
                      </p>
                    </div>
                    <UsersIcon className="size-4 text-white/35" />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-[10px] text-white/50">
                  <span className="flex items-center gap-1.5">
                    <Layers3Icon className="size-3.5 text-cyan-300" />
                    One connected workspace
                  </span>
                  <span className="flex items-center gap-1.5">
                    <ShieldCheckIcon className="size-3.5 text-emerald-300" />
                    Private by default
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-indigo-100/55">
              <span className="flex items-center gap-1.5">
                <ActivityIcon className="size-3.5 text-violet-300" />
                Ready in minutes
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheckIcon className="size-3.5 text-violet-300" />
                Privacy-first setup
              </span>
            </div>
          </div>

          <p className="text-xs text-indigo-100/40">Analytics with intent.</p>
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
              Already have an account?
            </span>
            <Button variant="ghost" render={<Link to="/login" />}>
              Log in
            </Button>
            <ModeToggle />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 items-center px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-5">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 lg:mb-4">
              <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                Get started
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                Create your workspace.
              </h2>
              <p className="text-muted-foreground mt-3 text-sm leading-6">
                Start collecting privacy-first analytics in minutes.
              </p>
            </div>

            <form
              id="sign-up-form"
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <FieldGroup className="flex flex-col gap-4 lg:gap-3">
                <form.Field
                  name="name"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                          placeholder="Your name"
                          autoComplete="name"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                />
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
                        <FieldLabel htmlFor={field.name}>Password</FieldLabel>
                        <div className="relative">
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="At least 6 characters"
                            type={showPassword ? 'text' : 'password'}
                            className="pr-10"
                            autoComplete="new-password"
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
                <form.Field
                  name="confirmPassword"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Confirm password
                        </FieldLabel>
                        <div className="relative">
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Re-enter your password"
                            autoComplete="new-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute inset-y-0 right-0"
                            tabIndex={-1}
                            onClick={() =>
                              setShowConfirmPassword((value) => !value)
                            }
                            aria-label={
                              showConfirmPassword
                                ? 'Hide confirmation password'
                                : 'Show confirmation password'
                            }
                          >
                            {showConfirmPassword ? (
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
              disabled={signUpPending}
              form="sign-up-form"
              type="submit"
              className="mt-6 w-full lg:mt-4"
              size="lg"
            >
              <LoadingSwap isLoading={signUpPending}>
                Create account
              </LoadingSwap>
              {!signUpPending && <ArrowUpRightIcon />}
            </Button>

            <p className="text-muted-foreground mt-6 text-center text-xs leading-5 lg:mt-4">
              By creating an account, you agree to use PathLens responsibly and
              keep your workspace secure.
            </p>

            <p className="text-muted-foreground mt-6 text-center text-sm lg:mt-4">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-foreground font-medium hover:underline"
              >
                Log in
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

      <section className="relative order-1 flex min-h-56 overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-950 to-cyan-950 px-5 py-8 text-white lg:hidden">
        <div className="pointer-events-none absolute -top-24 right-[-3rem] size-60 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-violet-200/70 uppercase">
              PathLens
            </p>
            <p className="mt-2 max-w-xs text-xl font-semibold tracking-tight">
              Build your clearest product view.
            </p>
          </div>
          <SparklesIcon className="mb-1 size-8 text-violet-300/80" />
        </div>
      </section>
    </main>
  )
}
