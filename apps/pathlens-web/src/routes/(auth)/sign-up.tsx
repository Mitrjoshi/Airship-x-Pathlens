import { useSignUp } from '@/mutations/auth'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import {
  ArrowLeft,
  ArrowUpRightIcon,
  Eye,
  EyeOff,
  LockIcon,
} from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { GithubIcon, GoogleIcon } from './login'
import { Badge } from '@workspace/ui/components/badge'
import { Marker, MarkerContent } from '@workspace/ui/components/marker'

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
    <div className="grid h-screen grid-cols-[0.5fr_1fr] items-center justify-center divide-x">
      <div className="relative flex h-screen flex-1 items-center justify-center">
        <Button
          className="absolute top-4 left-4 flex items-center justify-between"
          render={<Link to="/" />}
          variant="ghost"
        >
          <ArrowLeft />
          Back
        </Button>

        <div className="w-sm space-y-2">
          <div className="mb-12">
            <p className="text-3xl font-semibold">Welcome</p>
            <p className="text-muted-foreground">Sign up to Continue</p>
          </div>

          <div className="space-y-4">
            <Button className="relative w-full" variant="outline" size="lg">
              <GoogleIcon />
              Continue with Google
              <Badge
                variant={'outline'}
                className="bg-primary-foreground border-primary/50 absolute -top-2 -right-4 z-10 border"
              >
                Last used
              </Badge>
            </Button>

            <Button className="relative w-full" variant="outline" size="lg">
              <GithubIcon />
              Continue with Github
              {/* <Badge
                variant={'outline'}
                className="bg-primary-foreground border-primary/50 absolute -top-2 -right-4 z-10 border"
              >
                Last used
              </Badge> */}
            </Button>

            <Button className="relative w-full" variant="outline" size="lg">
              <LockIcon />
              Continue with SSO
              {/* <Badge
                variant={'outline'}
                className="bg-primary-foreground border-primary/50 absolute -top-2 -right-4 z-10 border"
              >
                Last used
              </Badge> */}
            </Button>
          </div>

          <Marker variant={'separator'}>
            <MarkerContent>or</MarkerContent>
          </Marker>

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
                          placeholder="Re enter your password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          className="pr-10"
                          autoComplete="new-password"
                          aria-label={
                            showConfirmPassword
                              ? 'Hide confirmation password'
                              : 'Show confirmation password'
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-y-0 right-0"
                          onClick={() =>
                            setShowConfirmPassword((prev) => !prev)
                          }
                          aria-label={
                            showConfirmPassword
                              ? 'Hide password'
                              : 'Show password'
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
            <LoadingSwap isLoading={signUpPending}>Create account</LoadingSwap>
            {!signUpPending && <ArrowUpRightIcon />}
          </Button>
        </div>
      </div>
      <div></div>
    </div>
  )
}
