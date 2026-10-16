import { useEffect, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { z } from 'zod'
import {
  useChangePassword,
  useDeleteAccount,
  useUpdateProfile,
} from '@/mutations/account'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Button } from '@workspace/ui/components/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { AlertCircleIcon, Loader2Icon, Trash2Icon } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@workspace/ui/components/popover'

export const Route = createFileRoute('/app/(entry)/settings')({
  component: RouteComponent,
})

const AVATARS = [
  '/avatars/panda.png',
  '/avatars/amur.png',
  '/avatars/elephant.png',
  '/avatars/turtle.png',
  '/avatars/gorilla.png',
  '/avatars/whale.png',
  '/avatars/orangutan.png',
  '/avatars/saola.png',
  '/avatars/pangolin.png',
  '/avatars/rhino.png',
]

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be 120 characters or less'),
  email: z.email('Enter a valid email address'),
  avatar: z.string().nullable(),
})

const getPasswordSchema = (hasPassword: boolean) =>
  z
    .object({
      currentPassword: hasPassword
        ? z.string().min(1, 'Current password is required')
        : z.string().optional(),
      newPassword: z.string().min(8, 'Password must be at least 8 characters'),
      confirmPassword: z.string().min(1, 'Please confirm your new password'),
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })

const getDeleteAccountSchema = (hasPassword: boolean) =>
  z.object({
    password: hasPassword
      ? z.string().min(1, 'Current password is required')
      : z.string().optional(),
    confirmation: z.literal('DELETE', {
      error: 'Type DELETE to confirm account deletion',
    }),
  })

function RouteComponent() {
  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })

  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.avatar
  )

  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const deleteAccount = useDeleteAccount()

  const profileForm = useForm({
    defaultValues: {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    },
    validators: {
      onChange: profileSchema,
    },
    onSubmit: async ({ value }) => {
      await updateProfile.mutateAsync(value)
      profileForm.reset(value)
    },
  })

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
    validators: {
      onChange: getPasswordSchema(user.hasPassword),
    },
    onSubmit: async ({ value }) => {
      await changePassword.mutateAsync(value)
      passwordForm.reset()
    },
  })

  const deleteForm = useForm({
    defaultValues: {
      password: '',
      confirmation: '',
    },
    validators: {
      onChange: getDeleteAccountSchema(user.hasPassword),
    },
    onSubmit: async ({ value }) => {
      await deleteAccount.mutateAsync({ password: value.password })
    },
  })

  useEffect(() => {
    if (profileForm.state.isDirty) return

    profileForm.reset({
      name: user.name,
      email: user.email,
      avatar: user.avatar,
    })
  }, [profileForm, user.avatar, user.email, user.name])

  return (
    <div>
      <Dialog>
        <div className="mx-auto max-w-4xl py-10">
          <div className="space-y-5">
            <p className="text-2xl font-semibold">Account Settings</p>

            <Card className="bg-card/30 rounded-none border-2 border-dashed">
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  void profileForm.handleSubmit()
                }}
              >
                <CardContent className="flex items-start gap-6 pb-4">
                  <Popover>
                    <PopoverTrigger>
                      <Avatar
                        className={'size-40 cursor-pointer overflow-hidden'}
                      >
                        <AvatarImage src={avatarPreview!} />
                        <AvatarFallback
                          className={
                            'bg-primary/40 text-7xl text-black dark:text-white'
                          }
                        >
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </PopoverTrigger>

                    <PopoverContent className={'w-fit'}>
                      <PopoverHeader>
                        <PopoverTitle>Avatars</PopoverTitle>
                      </PopoverHeader>
                      <div className="grid grid-cols-6 gap-2">
                        {AVATARS.map((avatar) => (
                          <Avatar
                            onClick={() => setAvatarPreview(avatar)}
                            className={'size-10 cursor-pointer overflow-hidden'}
                          >
                            <AvatarImage src={avatar} />
                            <AvatarFallback className={'text-xl'}>
                              {avatar
                                .split('/')
                                ?.pop()
                                ?.charAt(0)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}

                        <Avatar
                          className={'size-10 cursor-pointer overflow-hidden'}
                        >
                          <AvatarImage src={user.avatar!} />
                          <AvatarFallback
                            className={
                              'bg-primary/40 text-xl text-black dark:text-white'
                            }
                          >
                            {user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <div className="w-full space-y-4">
                    <profileForm.Field name="name">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid

                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Display Name
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(event) =>
                                field.handleChange(event.target.value)
                              }
                              aria-invalid={isInvalid}
                              autoComplete="name"
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    </profileForm.Field>

                    <profileForm.Field name="email">
                      {(field) => (
                        <Field>
                          <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            disabled
                            value={field.state.value}
                            autoComplete="email"
                          />
                        </Field>
                      )}
                    </profileForm.Field>
                  </div>
                </CardContent>
                <CardFooter className="justify-end bg-transparent">
                  <profileForm.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                  >
                    {([canSubmit, isSubmitting]) => {
                      const busy = isSubmitting || updateProfile.isPending

                      return (
                        <Button type="submit" disabled={!canSubmit || busy}>
                          {busy && (
                            <Loader2Icon className="size-4 animate-spin" />
                          )}
                          {busy ? 'Saving...' : 'Save changes'}
                        </Button>
                      )
                    }}
                  </profileForm.Subscribe>
                </CardFooter>
              </form>
            </Card>

            <Card className="bg-card/30 rounded-none border-2 border-dashed">
              <CardHeader>
                <CardTitle>
                  {user.hasPassword ? 'Change Password' : 'Set Password'}
                </CardTitle>
              </CardHeader>

              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  void passwordForm.handleSubmit()
                }}
              >
                <CardContent className="pb-4">
                  <FieldGroup>
                    {user.hasPassword && (
                      <passwordForm.Field name="currentPassword">
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid

                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                Current Password
                              </FieldLabel>
                              <Input
                                id={field.name}
                                name={field.name}
                                type="password"
                                placeholder="Enter your current password"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
                                aria-invalid={isInvalid}
                                autoComplete="current-password"
                              />
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          )
                        }}
                      </passwordForm.Field>
                    )}

                    <passwordForm.Field name="newPassword">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid

                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              New Password
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              type="password"
                              placeholder="Enter your new password"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(event) =>
                                field.handleChange(event.target.value)
                              }
                              aria-invalid={isInvalid}
                              autoComplete="new-password"
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    </passwordForm.Field>

                    <passwordForm.Field name="confirmPassword">
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid

                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Confirm Password
                            </FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              type="password"
                              placeholder="Confirm your new password"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(event) =>
                                field.handleChange(event.target.value)
                              }
                              aria-invalid={isInvalid}
                              autoComplete="new-password"
                            />
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    </passwordForm.Field>
                  </FieldGroup>
                </CardContent>

                <CardFooter className="justify-end gap-4 bg-transparent">
                  <passwordForm.Subscribe
                    selector={(state) => [state.canSubmit, state.isSubmitting]}
                  >
                    {([canSubmit, isSubmitting]) => {
                      const busy = isSubmitting || changePassword.isPending

                      return (
                        <Button type="submit" disabled={!canSubmit || busy}>
                          {busy && (
                            <Loader2Icon className="size-4 animate-spin" />
                          )}
                          {busy ? 'Saving...' : 'Save changes'}
                        </Button>
                      )
                    }}
                  </passwordForm.Subscribe>
                </CardFooter>
              </form>
            </Card>

            <Card className="bg-card/30 border-destructive/50 rounded-none border-2 border-dashed">
              <CardContent>
                <div className="flex items-start gap-4">
                  <AlertCircleIcon className="text-destructive" />
                  <div>
                    <p className="text-destructive font-medium">
                      Delete Account?
                    </p>
                    <p className="text-muted-foreground">
                      Permanently delete your account and all associated data.
                      This cannot be undone.
                    </p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-transparen justify-end gap-4">
                <DialogTrigger
                  render={
                    <Button variant="destructive">
                      <Trash2Icon className="size-4" />
                      Delete account
                    </Button>
                  }
                />
              </CardFooter>
            </Card>
          </div>
        </div>

        <DialogContent>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              deleteForm.handleSubmit()
            }}
          >
            <DialogHeader>
              <div className="flex items-start gap-4">
                <AlertCircleIcon
                  className="text-destructive shrink-0"
                  size={24}
                />
                <div className="flex flex-col gap-2">
                  <DialogTitle className="text-destructive">
                    Delete Account?
                  </DialogTitle>
                  <DialogDescription>
                    Permanently delete your account and all associated data.
                    This cannot be undone.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {user.hasPassword && (
                <deleteForm.Field name="password">
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Current password
                        </FieldLabel>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="password"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(event) =>
                            field.handleChange(event.target.value)
                          }
                          aria-invalid={isInvalid}
                          autoComplete="current-password"
                        />
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    )
                  }}
                </deleteForm.Field>
              )}

              <deleteForm.Field name="confirmation">
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && !field.state.meta.isValid
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>Confirmation</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        aria-invalid={isInvalid}
                        autoComplete="off"
                        className="font-mono"
                        placeholder="DELETE"
                      />
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}
                    </Field>
                  )
                }}
              </deleteForm.Field>
            </div>

            <DialogFooter>
              <DialogClose>
                <Button type="button" variant="ghost">
                  Cancel
                </Button>
              </DialogClose>
              <deleteForm.Subscribe
                selector={(state) => [state.canSubmit, state.isSubmitting]}
              >
                {([canSubmit, isSubmitting]) => {
                  const busy = isSubmitting || deleteAccount.isPending
                  return (
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={!canSubmit || busy}
                    >
                      {busy && <Loader2Icon className="size-4 animate-spin" />}
                      {busy ? 'Deleting...' : 'Delete account'}
                    </Button>
                  )
                }}
              </deleteForm.Subscribe>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
