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
  CardDescription,
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
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import {
  AlertCircleIcon,
  Camera,
  DeleteIcon,
  Loader2Icon,
  Trash2Icon,
} from 'lucide-react'
import { Label } from '@workspace/ui/components/label'
import { useTheme } from '@/components/common/theme-provider'
import { Separator } from '@workspace/ui/components/separator'
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group'

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

  const { theme, setTheme } = useTheme()

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
                <Avatar className={'group relative size-50 overflow-hidden'}>
                  <AvatarImage src={user.avatar!} />
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

                  <Separator />

                  <Field>
                    <FieldLabel>Avatars</FieldLabel>
                    <div className="flex items-center gap-2">
                      <Avatar
                        render={<Button size="icon-lg" variant={'outline'} />}
                      >
                        <AvatarImage src={user.avatar!} />
                        <AvatarFallback
                          className={'bg-primary/40 text-black dark:text-white'}
                        >
                          {user.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>

                      {user.githubAvatar && (
                        <Avatar
                          render={<Button size="icon-lg" variant={'outline'} />}
                        >
                          <AvatarImage src={user.githubAvatar!} />
                          <AvatarFallback>
                            {user?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      {user.googleAvatar && (
                        <Avatar
                          render={<Button size="icon-lg" variant={'outline'} />}
                        >
                          <AvatarImage src={user.googleAvatar!} />
                          <AvatarFallback>
                            {user?.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/30 rounded-none border-2 border-dashed"></Card>

            <Card className="bg-card/30 rounded-none border-2 border-dashed">
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Select theme for the App</CardDescription>
              </CardHeader>

              <CardContent className="flex items-center gap-4">
                <RadioGroup
                  defaultValue={theme}
                  className="grid grid-cols-[25%_25%_25%] gap-4"
                >
                  <FieldLabel htmlFor="light">
                    <Field
                      data-active={theme === 'light'}
                      orientation="vertical"
                      className="data-active:border-primary bg-muted/40 border-2 border-dashed"
                      onClick={() => setTheme('light')}
                    >
                      <FieldContent>
                        <div className="relative aspect-square w-full cursor-pointer overflow-hidden bg-white p-2 text-[#0b0b0b] duration-200">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="h-2.5 w-16 rounded-sm bg-[#0b0b0b]" />

                            <div className="flex gap-1">
                              <div className="size-2 rounded-full bg-[#0b0b0b]" />
                              <div className="size-2 rounded-full border border-[#0b0b0b]" />
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="mt-3 grid grid-cols-2 gap-1.5">
                            <div className="border border-[#0b0b0b] p-1.5">
                              <div className="h-1.5 w-8 bg-[#0b0b0b]/30" />
                              <div className="mt-1 h-3 w-10 bg-[#0b0b0b]" />
                            </div>

                            <div className="border border-[#0b0b0b] p-1.5">
                              <div className="h-1.5 w-7 bg-[#0b0b0b]/30" />
                              <div className="mt-1 h-3 w-8 bg-[#0b0b0b]" />
                            </div>
                          </div>

                          {/* Chart */}
                          <div className="mt-2 border border-[#0b0b0b] p-1.5">
                            <div className="mb-2 h-1.5 w-12 bg-[#0b0b0b]" />

                            <div className="relative h-12">
                              <svg
                                viewBox="0 0 120 40"
                                className="h-full w-full"
                                preserveAspectRatio="none"
                              >
                                <polyline
                                  points="0,32 15,27 28,30 42,17 55,23 68,12 80,18 94,7 108,13 120,3"
                                  fill="none"
                                  stroke="#0b0b0b"
                                  strokeWidth="2"
                                />
                              </svg>
                            </div>
                          </div>

                          {/* Bottom rows */}
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between border-b border-[#0b0b0b]/20 pb-1">
                              <div className="h-1.5 w-12 bg-[#0b0b0b]/40" />
                              <div className="h-1.5 w-5 bg-[#0b0b0b]" />
                            </div>

                            <div className="flex items-center justify-between border-b border-[#0b0b0b]/20 pb-1">
                              <div className="h-1.5 w-16 bg-[#0b0b0b]/40" />
                              <div className="h-1.5 w-7 bg-[#0b0b0b]" />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="h-1.5 w-10 bg-[#0b0b0b]/40" />
                              <div className="h-1.5 w-6 bg-[#0b0b0b]" />
                            </div>
                          </div>
                        </div>
                      </FieldContent>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="light" id="light" />
                        <FieldTitle>Light Mode</FieldTitle>
                      </div>
                    </Field>
                  </FieldLabel>

                  <FieldLabel htmlFor="dark">
                    <Field
                      data-active={theme === 'dark'}
                      orientation="vertical"
                      className="data-active:border-primary bg-muted/40 border-2 border-dashed"
                      onClick={() => setTheme('dark')}
                    >
                      <FieldContent>
                        <div className="relative aspect-square w-full cursor-pointer overflow-hidden bg-[#0b0b0b] p-2 text-white duration-200">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <div className="h-2.5 w-16 rounded-sm bg-white" />

                            <div className="flex gap-1">
                              <div className="size-2 rounded-full bg-white" />
                              <div className="size-2 rounded-full border border-white/40" />
                            </div>
                          </div>

                          {/* Stats */}
                          <div className="mt-3 grid grid-cols-2 gap-1.5">
                            <div className="border border-white/15 bg-white/[0.04] p-1.5">
                              <div className="h-1.5 w-8 bg-white/30" />
                              <div className="mt-1 h-3 w-10 bg-white" />
                            </div>

                            <div className="border border-white/15 bg-white/[0.04] p-1.5">
                              <div className="h-1.5 w-7 bg-white/30" />
                              <div className="mt-1 h-3 w-8 bg-white" />
                            </div>
                          </div>

                          {/* Chart */}
                          <div className="mt-2 border border-white/15 bg-white/[0.03] p-1.5">
                            <div className="mb-2 h-1.5 w-12 bg-white/70" />

                            <div className="relative h-12">
                              <svg
                                viewBox="0 0 120 40"
                                className="h-full w-full"
                                preserveAspectRatio="none"
                              >
                                <polyline
                                  points="0,32 15,27 28,30 42,17 55,23 68,12 80,18 94,7 108,13 120,3"
                                  fill="none"
                                  stroke="white"
                                  strokeWidth="2"
                                />
                              </svg>
                            </div>
                          </div>

                          {/* Data rows */}
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center justify-between border-b border-white/10 pb-1">
                              <div className="h-1.5 w-12 bg-white/30" />
                              <div className="h-1.5 w-5 bg-white/80" />
                            </div>

                            <div className="flex items-center justify-between border-b border-white/10 pb-1">
                              <div className="h-1.5 w-16 bg-white/30" />
                              <div className="h-1.5 w-7 bg-white/80" />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="h-1.5 w-10 bg-white/30" />
                              <div className="h-1.5 w-6 bg-white/80" />
                            </div>
                          </div>
                        </div>
                      </FieldContent>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="dark" id="dark" />
                        <FieldTitle>Dark Mode</FieldTitle>
                      </div>
                    </Field>
                  </FieldLabel>

                  <FieldLabel htmlFor="system">
                    <Field
                      orientation="vertical"
                      className="data-active:border-primary bg-muted/40 border-2 border-dashed"
                      data-active={theme === 'system'}
                      onClick={() => setTheme('system')}
                    >
                      <FieldContent>
                        <div className="relative aspect-square w-full cursor-pointer overflow-hidden duration-200">
                          <div
                            className="absolute inset-0 bg-[#0b0b0b] text-white"
                            style={{
                              clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                            }}
                          >
                            <div className="absolute inset-0 p-2">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div className="h-2.5 w-16 rounded-sm bg-white" />

                                <div className="flex gap-1">
                                  <div className="size-2 rounded-full bg-white" />
                                  <div className="size-2 rounded-full border border-white" />
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="mt-3 grid grid-cols-2 gap-1.5">
                                <div className="border border-white p-1.5">
                                  <div className="h-1.5 w-8 bg-white/30" />
                                  <div className="mt-1 h-3 w-10 bg-white" />
                                </div>

                                <div className="border border-white p-1.5">
                                  <div className="h-1.5 w-7 bg-white/30" />
                                  <div className="mt-1 h-3 w-8 bg-white" />
                                </div>
                              </div>

                              {/* Chart */}
                              <div className="mt-2 border border-white p-1.5">
                                <div className="mb-2 h-1.5 w-12 bg-white" />

                                <div className="relative h-12">
                                  <svg
                                    viewBox="0 0 120 40"
                                    className="h-full w-full"
                                    preserveAspectRatio="none"
                                  >
                                    <polyline
                                      points="0,32 15,27 28,30 42,17 55,23 68,12 80,18 94,7 108,13 120,3"
                                      fill="none"
                                      stroke="white"
                                      strokeWidth="2"
                                    />
                                  </svg>
                                </div>
                              </div>

                              {/* Bottom rows */}
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between border-b border-white/20 pb-1">
                                  <div className="h-1.5 w-12 bg-white/40" />
                                  <div className="h-1.5 w-5 bg-white" />
                                </div>

                                <div className="flex items-center justify-between border-b border-white/20 pb-1">
                                  <div className="h-1.5 w-16 bg-white/40" />
                                  <div className="h-1.5 w-7 bg-white" />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="h-1.5 w-10 bg-white/40" />
                                  <div className="h-1.5 w-6 bg-white" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div
                            className="absolute inset-0 bg-white text-[#0b0b0b]"
                            style={{
                              clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                            }}
                          >
                            <div className="absolute inset-0 p-2">
                              {/* Header */}
                              <div className="flex items-center justify-between">
                                <div className="h-2.5 w-16 rounded-sm bg-[#0b0b0b]" />

                                <div className="flex gap-1">
                                  <div className="size-2 rounded-full bg-[#0b0b0b]" />
                                  <div className="size-2 rounded-full border border-[#0b0b0b]" />
                                </div>
                              </div>

                              {/* Stats */}
                              <div className="mt-3 grid grid-cols-2 gap-1.5">
                                <div className="border border-[#0b0b0b] p-1.5">
                                  <div className="h-1.5 w-8 bg-[#0b0b0b]/30" />
                                  <div className="mt-1 h-3 w-10 bg-[#0b0b0b]" />
                                </div>

                                <div className="border border-[#0b0b0b] p-1.5">
                                  <div className="h-1.5 w-7 bg-[#0b0b0b]/30" />
                                  <div className="mt-1 h-3 w-8 bg-[#0b0b0b]" />
                                </div>
                              </div>

                              {/* Chart */}
                              <div className="mt-2 border border-[#0b0b0b] p-1.5">
                                <div className="mb-2 h-1.5 w-12 bg-[#0b0b0b]" />

                                <div className="relative h-12">
                                  <svg
                                    viewBox="0 0 120 40"
                                    className="h-full w-full"
                                    preserveAspectRatio="none"
                                  >
                                    <polyline
                                      points="0,32 15,27 28,30 42,17 55,23 68,12 80,18 94,7 108,13 120,3"
                                      fill="none"
                                      stroke="#0b0b0b"
                                      strokeWidth="2"
                                    />
                                  </svg>
                                </div>
                              </div>

                              {/* Bottom rows */}
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center justify-between border-b border-[#0b0b0b]/20 pb-1">
                                  <div className="h-1.5 w-12 bg-[#0b0b0b]/40" />
                                  <div className="h-1.5 w-5 bg-[#0b0b0b]" />
                                </div>

                                <div className="flex items-center justify-between border-b border-[#0b0b0b]/20 pb-1">
                                  <div className="h-1.5 w-16 bg-[#0b0b0b]/40" />
                                  <div className="h-1.5 w-7 bg-[#0b0b0b]" />
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="h-1.5 w-10 bg-[#0b0b0b]/40" />
                                  <div className="h-1.5 w-6 bg-[#0b0b0b]" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </FieldContent>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="system" id="system" />
                        <FieldTitle>System</FieldTitle>
                      </div>
                    </Field>
                  </FieldLabel>
                </RadioGroup>
              </CardContent>
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
              <CardFooter className="justify-end bg-transparent">
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
