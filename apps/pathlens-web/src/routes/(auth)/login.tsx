import { motion } from 'motion/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { ArrowLeft, EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react'
import { useState } from 'react'
import { useLogin } from '@/mutations/auth'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { Marker, MarkerContent } from '@workspace/ui/components/marker'
import { Badge } from '@workspace/ui/components/badge'

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
            <p className="text-3xl font-semibold">Welcome Back</p>
            <p className="text-muted-foreground">Sign in to Continue</p>
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
                      <InputGroup className="overflow-hidden">
                        <InputGroupInput
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
            </FieldGroup>
          </form>

          <Button form="login-form" type="submit" className={'w-full'}>
            <LoadingSwap isLoading={loginPending}>Log in</LoadingSwap>
          </Button>

          <div>
            <p className="text-muted-foreground text-center text-sm">
              Don't have an Account?{' '}
              <Button
                className={'h-6 p-0 underline'}
                variant={'link'}
                render={<Link to="/sign-up" />}
              >
                Sign Up
              </Button>
            </p>
          </div>

          <p className="text-muted-foreground mx-auto mt-8 max-w-[75%] text-center text-xs">
            By continuing, I agree to Pathlens's terms, privacy policy, and
            cookie policy.
          </p>
        </div>
      </div>

      <div className="relative flex h-screen flex-1 items-center justify-center overflow-hidden">
        {/* subtle background grid */}
        <div className="line-grid-uni pointer-events-none absolute inset-0 opacity-40" />

        <div className="relative z-10 max-w-4xl px-6 text-center">
          {/* quote mark */}
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-primary/20 absolute -top-20 left-1/2 -translate-x-1/2 text-[180px] leading-none select-none"
          >
            “
          </motion.span>

          {/* eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground mb-5 flex items-center justify-center gap-2 text-xs"
          >
            Loved by people who care about clarity
          </motion.div>

          {/* quote */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              delay: 0.18,
              duration: 0.6,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="text-foreground text-4xl font-medium tracking-tight md:text-6xl md:leading-[1.08]"
          >
            Pathlens makes website analytics feel
            <span className="text-muted-foreground"> ridiculously simple.</span>
          </motion.p>

          {/* author */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex items-center justify-center gap-2"
          >
            <div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
              <img
                src="/logo.png"
                alt="Pathlens"
                className="size-7 object-contain dark:invert"
              />
            </div>

            <div className="text-left">
              <p className="text-foreground text-sm font-medium">@Pathlens</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export const GoogleIcon = () => {
  return (
    <svg
      className="size-4 dark:invert"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      id="google"
    >
      <path
        d="m12 10.282h11.328c.116.6.184 1.291.187 1.997v.003c.001.066.002.144.002.222 0 2.131-.527 4.139-1.457 5.901l.033-.069c-.941 1.762-2.324 3.18-4.004 4.137l-.051.027c-1.675.945-3.677 1.502-5.809 1.502-.081 0-.162-.001-.242-.002h.012c-.013 0-.029 0-.044 0-1.672 0-3.263-.348-4.704-.975l.076.03c-2.902-1.219-5.164-3.482-6.354-6.306l-.029-.077c-.598-1.379-.945-2.985-.945-4.672s.348-3.293.975-4.75l-.03.078c1.219-2.902 3.482-5.164 6.306-6.354l.077-.029c1.364-.597 2.953-.944 4.624-.944h.051-.003c.059-.001.129-.002.199-.002 3.045 0 5.811 1.197 7.853 3.147l-.004-.004-3.266 3.141c-1.188-1.152-2.81-1.863-4.598-1.863-.065 0-.129.001-.194.003h.009c-.014 0-.03 0-.047 0-1.358 0-2.629.378-3.711 1.034l.032-.018c-2.246 1.358-3.725 3.788-3.725 6.562s1.479 5.204 3.691 6.543l.034.019c1.051.638 2.321 1.016 3.679 1.016h.05-.003.083c.864 0 1.695-.137 2.474-.392l-.056.016c.716-.222 1.339-.542 1.893-.95l-.017.012c.486-.373.907-.794 1.268-1.264l.012-.016c.312-.393.582-.841.79-1.321l.015-.039c.149-.35.271-.759.346-1.184l.005-.035h-6.811z"
        fill="#000000"
      ></path>
    </svg>
  )
}

export const GithubIcon = () => {
  return (
    <svg
      className="size-4 dark:invert"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      id="github"
    >
      <path
        d="M22 12.247a10 10 0 0 1-6.833 9.488c-.507.1-.687-.214-.687-.481 0-.328.012-1.407.012-2.743a2.386 2.386 0 0 0-.679-1.852c2.228-.248 4.566-1.093 4.566-4.935a3.859 3.859 0 0 0-1.028-2.683 3.591 3.591 0 0 0-.1-2.647s-.838-.269-2.747 1.025a9.495 9.495 0 0 0-5.007 0c-1.91-1.294-2.75-1.025-2.75-1.025a3.6 3.6 0 0 0-.1 2.647 3.864 3.864 0 0 0-1.027 2.683c0 3.832 2.334 4.69 4.555 4.942A2.137 2.137 0 0 0 9.54 18a2.128 2.128 0 0 1-2.91-.831 2.1 2.1 0 0 0-1.53-1.027s-.977-.013-.069.608a2.646 2.646 0 0 1 1.109 1.463s.586 1.944 3.368 1.34c.005.835.014 1.463.014 1.7 0 .265-.183.574-.683.482A10 10 0 1 1 22 12.247Z"
        fill="#000000"
      ></path>
    </svg>
  )
}
