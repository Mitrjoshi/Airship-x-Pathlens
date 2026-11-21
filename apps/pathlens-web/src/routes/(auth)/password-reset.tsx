import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useConfirmPasswordReset, useResetPassword } from '@/mutations/auth'
import { startGithubLogin } from '@/lib/github-auth'
import { startGoogleLogin } from '@/lib/google-auth'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { GithubIcon, GoogleIcon } from './login'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useState } from 'react'
import { Marker, MarkerContent } from '@workspace/ui/components/marker'

export const Route = createFileRoute('/(auth)/password-reset')({
  component: RouteComponent,
  validateSearch: z.object({
    token: z.string().optional(),
  }),
})

const formSchema = z.object({
  email: z.email('Please enter a valid email address.'),
})

function RouteComponent() {
  const { token } = Route.useSearch()

  return token ? (
    <ConfirmPasswordResetForm key={token} token={token} />
  ) : (
    <RequestPasswordResetForm />
  )
}

const confirmPasswordSchema = z
  .object({
    password: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z
      .string()
      .min(6, 'Password must be at least 6 characters.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

function ConfirmPasswordResetForm({ token }: { token: string }) {
  const [showPassword, setShowPassword] = useState(false)

  const {
    mutate: confirmPasswordReset,
    isPending,
    error,
  } = useConfirmPasswordReset()

  const form = useForm({
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
    validators: {
      onSubmit: confirmPasswordSchema,
    },
    onSubmit: async ({ value }) => {
      if (!isPending) {
        confirmPasswordReset({ token, ...value })
      }
    },
  })

  return (
    <div className="w-full space-y-2 md:w-sm">
      <div className="mb-12">
        <p className="text-3xl font-semibold">Reset your password</p>
        <p className="text-muted-foreground">
          Choose a new password with at least 6 characters.
        </p>
      </div>

      <form
        id="confirm-password-reset-form"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <FieldGroup className="flex flex-col gap-5 lg:gap-4">
          {(['password', 'confirmPassword'] as const).map((name) => (
            <form.Field
              key={name}
              name={name}
              children={(field) => {
                const isInvalid =
                  field.state.meta.isTouched && !field.state.meta.isValid

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>
                      {name === 'password'
                        ? 'New password'
                        : 'Confirm password'}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        autoComplete="new-password"
                        disabled={isPending}
                        placeholder={
                          name === 'password'
                            ? 'Enter new password'
                            : 'Confirm new password'
                        }
                        type={showPassword ? 'text' : 'password'}
                      />
                      <InputGroupButton
                        type="button"
                        variant="ghost"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={
                          showPassword ? 'Hide password' : 'Show password'
                        }
                      >
                        {showPassword ? (
                          <EyeOffIcon className="size-4" />
                        ) : (
                          <EyeIcon className="size-4" />
                        )}
                      </InputGroupButton>
                    </InputGroup>
                    {isInvalid && (
                      <FieldError errors={field.state.meta.errors} />
                    )}
                  </Field>
                )
              }}
            />
          ))}
        </FieldGroup>
      </form>

      {error && (
        <div role="alert" className="text-destructive space-y-2 text-sm">
          <p>{error.message}</p>
          <Link
            to="/password-reset"
            search={{ token: undefined }}
            className="underline"
          >
            Request a new reset link
          </Link>
        </div>
      )}

      <Button
        form="confirm-password-reset-form"
        type="submit"
        className="w-full"
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? 'Resetting password…' : 'Reset password'}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        <Button
          className="h-6 p-0 underline"
          variant="link"
          render={<Link to="/login" />}
        >
          Back to login
        </Button>
      </p>
    </div>
  )
}

function RequestPasswordResetForm() {
  const { mutate: resetPassword, isPending } = useResetPassword()

  const form = useForm({
    defaultValues: {
      email: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      if (!isPending) {
        resetPassword(value)
      }
    },
  })

  return (
    <div className="w-full space-y-2 md:w-sm">
      <div className="mb-12">
        <p className="text-3xl font-semibold">Forgot Password?</p>
        <p className="text-muted-foreground">
          Enter your email address and we'll send you instructions to access
          your account.
        </p>
      </div>

      <form
        id="password-reset-form"
        autoComplete="on"
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
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
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              )
            }}
          />
        </FieldGroup>
      </form>

      <Button
        form="password-reset-form"
        type="submit"
        className="w-full"
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? 'Sending reset link…' : 'Send reset link'}
      </Button>

      <Marker className="mt-4" variant={'separator'}>
        <MarkerContent>or</MarkerContent>
      </Marker>

      <div className="space-y-3 pt-4">
        <p className="text-muted-foreground text-center text-sm">
          Signed up with Google or GitHub? Continue with that provider instead.
          Password resets are only available for accounts with a password.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              startGoogleLogin()
            }}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => startGithubLogin()}
          >
            <GithubIcon />
            Continue with GitHub
          </Button>
        </div>
      </div>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        Remember your password?{' '}
        <Button
          className="h-6 p-0 underline"
          variant="link"
          render={<Link to="/login" />}
        >
          Log in
        </Button>
      </p>
    </div>
  )
}
