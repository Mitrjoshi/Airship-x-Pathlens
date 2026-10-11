import { useEffect, useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { z } from 'zod'
import { toast } from 'sonner'
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
import {
  AlertCircleIcon,
  Loader2Icon,
  LogOutIcon,
  Trash2Icon,
} from 'lucide-react'
import { Separator } from '@workspace/ui/components/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@workspace/ui/components/popover'

export const Route = createFileRoute('/app/(entry)/settings')({
  component: RouteComponent,
})

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be 120 characters or less'),
  email: z.email('Enter a valid email address'),
  avatar: z.string().nullable(),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Current password is required'),
  confirmation: z.literal('DELETE', {
    error: 'Type DELETE to confirm account deletion',
  }),
})

const avatars = ['/avatar.png', '/saola.png', '/amur.png']

function RouteComponent() {
  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const deleteAccount = useDeleteAccount()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState(user.avatar)

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
      onChange: passwordSchema,
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
      onChange: deleteAccountSchema,
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

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Choose a JPEG, PNG, or WebP image.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Avatar must be 2 MB or smaller.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      setAvatarPreview(reader.result)
      profileForm.setFieldValue('avatar', reader.result)
    }
    reader.readAsDataURL(file)
  }

  function handleRemoveAvatar() {
    setAvatarPreview(null)
    profileForm.setFieldValue('avatar', null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDeleteDialogChange(open: boolean) {
    setIsDeleteOpen(open)
    if (!open) deleteForm.reset()
  }

  return (
    <div>
      <Dialog>
        <div className="mx-auto max-w-4xl py-10">
          <div className="space-y-5">
            <p className="text-2xl font-semibold">Account Settings</p>

            <Card className="bg-card/30 rounded-none border-2 border-dashed">
              <CardContent className="flex items-start gap-6">
                <Avatar className={'size-40 cursor-pointer overflow-hidden'}>
                  <AvatarImage src={avatarPreview!} />
                  <AvatarFallback
                    className={
                      'bg-primary/40 text-7xl text-black dark:text-white'
                    }
                  >
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>

                <div className="w-full space-y-4">
                  <Field>
                    <FieldLabel>Display Name</FieldLabel>
                    <Input value={user.name} />
                  </Field>

                  <Field>
                    <FieldLabel>Email</FieldLabel>
                    <Input value={user.email} />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/30 rounded-none border-2 border-dashed">
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
              </CardHeader>

              <CardContent>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Current Password</FieldLabel>
                    <Input placeholder="Enter your current password" />
                  </Field>
                  <Field>
                    <FieldLabel>New Password</FieldLabel>
                    <Input placeholder="Enter your new password" />
                  </Field>
                  <Field>
                    <FieldLabel>Confirm Password</FieldLabel>
                    <Input placeholder="Confirm your new password" />
                  </Field>
                </FieldGroup>
              </CardContent>

              <CardFooter className="bg-transparen justify-end gap-4">
                <DialogTrigger render={<Button>Save changes</Button>} />
              </CardFooter>
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
