import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ActivityIcon,
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  Eye,
  EyeOff,
  KeyRoundIcon,
  LockKeyholeIcon,
  MailCheckIcon,
  ShieldCheckIcon,
  SparklesIcon,
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
import {
  useConfirmPasswordReset,
  useRequestPasswordReset,
} from '@/mutations/auth'

export const Route = createFileRoute('/(auth)/password-reset')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : undefined,
  }),
  component: RouteComponent,
})

const requestSchema = z.object({
  email: z.email(),
})

const resetSchema = z
  .object({
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
  const { token } = Route.useSearch()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [requestSent, setRequestSent] = useState(false)
  const [resetComplete, setResetComplete] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

  const requestMutation = useRequestPasswordReset()
  const confirmMutation = useConfirmPasswordReset()

  const requestForm = useForm({
    defaultValues: {
      email: '',
    },
    validators: {
      onSubmit: requestSchema,
    },
    onSubmit: async ({ value: { email } }) => {
      requestMutation.mutate(
        { email },
        {
          onSuccess: () => {
            setSubmittedEmail(email)
            setRequestSent(true)
          },
        }
      )
    },
  })

  const resetForm = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    validators: {
      onSubmit: resetSchema,
    },
    onSubmit: async ({ value: { password, confirmPassword } }) => {
      if (!token) return

      confirmMutation.mutate(
        {
          token,
          password,
          confirmPassword,
        },
        {
          onSuccess: () => setResetComplete(true),
        }
      )
    },
  })

  const isResetMode = Boolean(token)
  const isSuccess = isResetMode ? resetComplete : requestSent

  return (
    <main className="bg-background flex min-h-screen flex-col lg:grid lg:h-screen lg:min-h-0 lg:grid-cols-[minmax(0,1.05fr)_minmax(30rem,0.95fr)]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-blue-950 text-white lg:flex lg:h-screen lg:min-h-0 lg:flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-[-8rem] size-[38rem] rounded-full bg-emerald-400/20 blur-3xl" />
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
            <div className="mb-5 flex items-center gap-2 text-[10px] font-medium tracking-[0.18em] text-emerald-200/80 uppercase">
              <KeyRoundIcon className="size-3.5 text-emerald-300" />A secure way
              back in
            </div>
            <h1 className="max-w-lg text-3xl leading-[1.02] font-semibold tracking-[-0.06em] xl:text-5xl">
              Get back to the work that matters.
            </h1>
            <p className="mt-4 max-w-md text-xs leading-5 text-emerald-100/65 xl:text-sm">
              Reset your password in a few calm steps, then return to the
              product signals your team depends on.
            </p>

            <div className="relative mt-7">
              <div className="absolute -inset-5 rounded-[2rem] bg-emerald-400/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-950/55 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded bg-white/10 text-[9px] font-semibold">
                      P
                    </span>
                    <span className="text-xs font-medium text-white/80">
                      Account recovery
                    </span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[10px] text-emerald-300">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Protected
                  </span>
                </div>

                <div className="space-y-3 p-4">
                  <div
                    className={`flex items-center gap-3 rounded-xl border p-3 ${isResetMode ? 'border-emerald-300/20 bg-emerald-300/5' : 'border-emerald-300/30 bg-emerald-300/10 shadow-lg shadow-emerald-950/20'}`}
                  >
                    <span className="flex size-7 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                      {isResetMode ? (
                        <CheckIcon className="size-3.5" />
                      ) : (
                        <span className="text-xs font-semibold">1</span>
                      )}
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-medium">Request a link</p>
                      <p className="mt-0.5 text-[10px] text-white/45">
                        We&apos;ll send a private recovery email
                      </p>
                    </div>
                    {isResetMode && (
                      <span className="text-[10px] text-emerald-300">Done</span>
                    )}
                  </div>
                  <div
                    className={`flex items-center gap-3 rounded-xl border p-3 ${isResetMode ? 'border-cyan-300/30 bg-cyan-300/10 shadow-lg shadow-cyan-950/20' : 'border-white/10 bg-white/5'}`}
                  >
                    <span className="flex size-7 items-center justify-center rounded-full border border-white/20 text-xs text-white/60">
                      2
                    </span>
                    <div className="flex-1">
                      <p
                        className={`text-xs font-medium ${isResetMode ? 'text-white' : 'text-white/65'}`}
                      >
                        Choose a new password
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/35">
                        One-time link, valid for 30 minutes
                      </p>
                    </div>
                    <LockKeyholeIcon
                      className={`size-4 ${isResetMode ? 'text-cyan-300' : 'text-white/35'}`}
                    />
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                    <span className="flex size-7 items-center justify-center rounded-full border border-white/20 text-xs text-white/50">
                      3
                    </span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-white/65">
                        Return to your workspace
                      </p>
                      <p className="mt-0.5 text-[10px] text-white/35">
                        Your analytics stay right where you left them
                      </p>
                    </div>
                    <ActivityIcon className="size-4 text-white/35" />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-[10px] text-white/50">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheckIcon className="size-3.5 text-emerald-300" />
                    Private by default
                  </span>
                  <span className="flex items-center gap-1.5">
                    <SparklesIcon className="size-3.5 text-cyan-300" />
                    Back in focus
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-emerald-100/55">
              <span className="flex items-center gap-1.5">
                <ShieldCheckIcon className="size-3.5 text-emerald-300" />
                Secure recovery
              </span>
              <span className="flex items-center gap-1.5">
                <ActivityIcon className="size-3.5 text-emerald-300" />
                Workspace intact
              </span>
            </div>
          </div>

          <p className="text-xs text-emerald-100/40">Analytics with intent.</p>
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
                {isResetMode ? 'Secure recovery' : 'Account access'}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
                {isResetMode
                  ? 'Choose a new password.'
                  : 'Find your way back in.'}
              </h2>
              <p className="text-muted-foreground mt-4 text-sm leading-6">
                {isResetMode
                  ? 'Create a strong password for your PathLens workspace.'
                  : 'Enter your email and we’ll send a secure link to reset your password.'}
              </p>
            </div>

            {isSuccess ? (
              <div
                className="border-border bg-muted/30 rounded-xl border p-5"
                aria-live="polite"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                  {isResetMode ? (
                    <CheckIcon className="size-5" />
                  ) : (
                    <MailCheckIcon className="size-5" />
                  )}
                </div>
                <h3 className="mt-4 text-sm font-semibold">
                  {isResetMode ? 'Password updated.' : 'Check your inbox.'}
                </h3>
                <p className="text-muted-foreground mt-2 text-sm leading-6">
                  {isResetMode
                    ? 'Your password is ready. Use it the next time you log in.'
                    : `If an account exists for ${submittedEmail}, we sent a reset link. It expires in 30 minutes.`}
                </p>
                {isResetMode ? (
                  <Button className="mt-5 w-full" render={<Link to="/login" />}>
                    Continue to login
                    <ArrowUpRightIcon />
                  </Button>
                ) : (
                  <Button
                    className="mt-5 w-full"
                    variant="outline"
                    onClick={() => {
                      setRequestSent(false)
                      requestForm.reset()
                    }}
                  >
                    Use another email
                  </Button>
                )}
              </div>
            ) : isResetMode ? (
              <>
                <form
                  id="password-reset-confirm-form"
                  autoComplete="off"
                  onSubmit={(event) => {
                    event.preventDefault()
                    resetForm.handleSubmit()
                  }}
                >
                  <FieldGroup className="flex flex-col gap-5 lg:gap-4">
                    <resetForm.Field
                      name="password"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              New password
                            </FieldLabel>
                            <div className="relative">
                              <Input
                                id={field.name}
                                name={field.name}
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
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
                                onClick={() =>
                                  setShowPassword((value) => !value)
                                }
                                aria-label={
                                  showPassword
                                    ? 'Hide new password'
                                    : 'Show new password'
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
                    <resetForm.Field
                      name="confirmPassword"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
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
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
                                aria-invalid={isInvalid}
                                placeholder="Re-enter your password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="pr-10"
                                autoComplete="new-password"
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
                  disabled={confirmMutation.isPending}
                  form="password-reset-confirm-form"
                  type="submit"
                  className="mt-7 w-full lg:mt-5"
                  size="lg"
                >
                  <LoadingSwap isLoading={confirmMutation.isPending}>
                    Update password
                  </LoadingSwap>
                  {!confirmMutation.isPending && <ArrowUpRightIcon />}
                </Button>
              </>
            ) : (
              <>
                <form
                  id="password-reset-request-form"
                  autoComplete="off"
                  onSubmit={(event) => {
                    event.preventDefault()
                    requestForm.handleSubmit()
                  }}
                >
                  <FieldGroup>
                    <requestForm.Field
                      name="email"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(event) =>
                                field.handleChange(event.target.value)
                              }
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
                  </FieldGroup>
                </form>

                <Button
                  disabled={requestMutation.isPending}
                  form="password-reset-request-form"
                  type="submit"
                  className="mt-7 w-full lg:mt-5"
                  size="lg"
                >
                  <LoadingSwap isLoading={requestMutation.isPending}>
                    Send reset link
                  </LoadingSwap>
                  {!requestMutation.isPending && <ArrowUpRightIcon />}
                </Button>
              </>
            )}

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
                    Reset links are single-use and expire after 30 minutes.
                  </p>
                </div>
                <CheckIcon className="ml-auto size-4 shrink-0 text-emerald-500" />
              </div>
            </div>

            <p className="text-muted-foreground mt-8 text-center text-sm lg:mt-5">
              Remember your password?{' '}
              <Link
                to="/login"
                className="text-foreground font-medium hover:underline"
              >
                Back to login
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

      <section className="relative order-1 flex min-h-56 overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-blue-950 px-5 py-8 text-white lg:hidden">
        <div className="pointer-events-none absolute -top-24 right-[-3rem] size-60 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-[0.16em] text-emerald-200/70 uppercase">
              PathLens
            </p>
            <p className="mt-2 max-w-xs text-xl font-semibold tracking-tight">
              A secure path back to your product view.
            </p>
          </div>
          <KeyRoundIcon className="mb-1 size-8 text-emerald-300/80" />
        </div>
      </section>
    </main>
  )
}
