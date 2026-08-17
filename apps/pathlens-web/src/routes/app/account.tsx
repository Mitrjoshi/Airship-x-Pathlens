import { AppHeader } from '@/components/common/app-header'
import { PageHeader, PageLayout } from '@/components/common/page-layout'
import {
  useChangePassword,
  useDeleteAccount,
  useUpdateProfile,
} from '@/mutations/account'
import { useAcceptNotification } from '@/mutations/workspace'
import { getUsersOptions } from '@/queries/user'
import { getNotificationsOptions } from '@/queries/workspace'
import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Bell, Check, KeyRound, Loader2, Shield, Trash2 } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@workspace/ui/components/tabs'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import { Badge } from '@workspace/ui/components/badge'
import { Separator } from '@workspace/ui/components/separator'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@workspace/ui/components/dialog'

export const Route = createFileRoute('/app/account')({
  component: RouteComponent,
  staticData: {
    breadcrumb: 'Account',
  },
})

const profileSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be 120 characters or less'),
  email: z.string().email('Enter a valid email address'),
})

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

function FieldError({
  errors,
}: {
  errors: Array<{ message?: string } | string | undefined>
}) {
  if (!errors.length) return null

  return (
    <p className="text-destructive text-sm">
      {typeof errors[0] === 'string' ? errors[0] : errors[0]?.message}
    </p>
  )
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')

  return initials.toUpperCase() || 'PL'
}

function formatNotificationDate(value: string | null): string {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(date)
}

function formatNotificationType(type: string): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function RouteComponent() {
  const routeUser = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })
  const { data: userData } = useQuery(getUsersOptions())
  const {
    data: notificationsData,
    isPending: notificationsPending,
    isError: notificationsError,
  } = useQuery(getNotificationsOptions())
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const deleteAccount = useDeleteAccount()
  const acceptNotification = useAcceptNotification()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const user = userData?.data ?? routeUser

  const canDeleteAccount =
    deletePassword.length > 0 && deleteConfirmation.trim() === 'DELETE'

  const profileForm = useForm({
    defaultValues: {
      name: '',
      email: '',
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

  useEffect(() => {
    if (!user || profileForm.state.isDirty) return

    profileForm.reset({
      name: user.name,
      email: user.email,
    })
  }, [profileForm, user])

  const notifications = notificationsData?.data ?? []

  return (
    <PageLayout>
      <AppHeader
        user={{
          name: user?.name ?? 'PathLens user',
          email: user?.email ?? '',
          avatar: user?.avatar,
        }}
        backToWorkspaces
      />

      <PageHeader
        eyebrow="Account"
        title="Your account."
        description="Manage your personal profile, security, and notifications."
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList
          variant="line"
          className="w-full justify-start overflow-x-auto sm:w-fit"
        >
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="space-y-3">
          <Card className="py-0">
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>Profile photo</CardTitle>
              <CardDescription>
                This is displayed across your workspaces.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
              <Avatar className="size-16 shrink-0">
                <AvatarImage
                  src={user?.avatar ?? undefined}
                  alt={user?.name ?? 'PathLens user'}
                />
                <AvatarFallback className="text-lg">
                  {getInitials(user?.name ?? '')}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="font-medium">Personal avatar</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {user?.avatar
                    ? 'Your current profile photo is shown across your workspaces.'
                    : 'No profile photo has been added yet.'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="py-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                profileForm.handleSubmit()
              }}
            >
              <CardHeader className="border-b px-5 py-5">
                <CardTitle>Personal information</CardTitle>
                <CardDescription>
                  Update your name and email address.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-5 p-5 sm:grid-cols-2">
                <profileForm.Field name="name">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Full Name</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </div>
                  )}
                </profileForm.Field>

                <profileForm.Field name="email">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Email Address</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="email"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </div>
                  )}
                </profileForm.Field>
              </CardContent>

              <CardFooter className="justify-end px-5 py-4">
                <profileForm.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={!canSubmit || updateProfile.isPending}
                    >
                      {(isSubmitting || updateProfile.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  )}
                </profileForm.Subscribe>
              </CardFooter>
            </form>
          </Card>

          <Card className="border-destructive/50 py-0">
            <CardHeader className="border-b px-5 py-5">
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="text-destructive h-5 w-5" />
                Delete Account
              </CardTitle>
              <CardDescription>
                Permanently delete your account, workspaces you own, and all
                associated data. This action cannot be undone.
              </CardDescription>
            </CardHeader>

            <CardFooter className="p-5">
              <Dialog
                open={isDeleteOpen}
                onOpenChange={(open) => {
                  setIsDeleteOpen(open)

                  if (!open) {
                    setDeletePassword('')
                    setDeleteConfirmation('')
                  }
                }}
              >
                <DialogTrigger
                  render={
                    <Button variant="destructive">Delete My Account</Button>
                  }
                />

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete your account?</DialogTitle>
                    <DialogDescription>
                      Enter your current password and type DELETE to confirm
                      that you want to permanently remove your account.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="delete-account-password">
                        Current password
                      </Label>
                      <Input
                        id="delete-account-password"
                        type="password"
                        value={deletePassword}
                        onChange={(event) =>
                          setDeletePassword(event.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="delete-account-confirmation">
                        Confirmation
                      </Label>
                      <Input
                        id="delete-account-confirmation"
                        value={deleteConfirmation}
                        onChange={(event) =>
                          setDeleteConfirmation(event.target.value)
                        }
                        placeholder="DELETE"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="destructive"
                      disabled={!canDeleteAccount || deleteAccount.isPending}
                      onClick={() =>
                        deleteAccount.mutate({ password: deletePassword })
                      }
                    >
                      {deleteAccount.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Delete my account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="space-y-3">
          <Card className="py-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                e.stopPropagation()
                passwordForm.handleSubmit()
              }}
            >
              <CardHeader className="border-b px-5 py-5">
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your account password.</CardDescription>
              </CardHeader>

              <CardContent className="space-y-5 p-5">
                <passwordForm.Field name="currentPassword">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Current password</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </div>
                  )}
                </passwordForm.Field>

                <Separator />

                <passwordForm.Field name="newPassword">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>New password</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </div>
                  )}
                </passwordForm.Field>

                <passwordForm.Field name="confirmPassword">
                  {(field) => (
                    <div className="space-y-2">
                      <Label htmlFor={field.name}>Confirm new password</Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type="password"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <FieldError errors={field.state.meta.errors} />
                    </div>
                  )}
                </passwordForm.Field>
              </CardContent>

              <CardFooter className="justify-end px-5 py-4">
                <passwordForm.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={!canSubmit || changePassword.isPending}
                    >
                      {(isSubmitting || changePassword.isPending) && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      <KeyRound />
                      Update password
                    </Button>
                  )}
                </passwordForm.Subscribe>
              </CardFooter>
            </form>
          </Card>

          <Card className="py-0">
            <CardContent className="flex items-center justify-between gap-4 p-4 sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Shield />
                </div>
                <div className="min-w-0">
                  <CardTitle>Two-factor authentication</CardTitle>
                  <CardDescription>
                    Two-factor authentication is not available in this
                    deployment yet.
                  </CardDescription>
                </div>
              </div>

              <Badge variant="outline">Unavailable</Badge>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>Active sessions</CardTitle>
              <CardDescription>
                Devices currently signed in to your account.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5">
              <div className="bg-muted/50 text-muted-foreground rounded-xl border border-dashed p-4 text-sm">
                Session history and remote session revocation are not available
                yet.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="py-0">
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Workspace invitations and account notifications from PathLens.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 p-5">
              {notificationsPending ? (
                <div className="text-muted-foreground flex items-center justify-center gap-2 rounded-xl border border-dashed p-8 text-sm">
                  <Loader2 className="size-4 animate-spin" />
                  Loading notifications...
                </div>
              ) : notificationsError ? (
                <div className="text-destructive rounded-xl border border-dashed p-8 text-center text-sm">
                  Unable to load notifications.
                </div>
              ) : notifications.length === 0 ? (
                <div className="text-muted-foreground flex flex-col items-center gap-2 rounded-xl border border-dashed p-8 text-center text-sm">
                  <Check className="size-5" />
                  You&apos;re all caught up.
                </div>
              ) : (
                notifications.map((notification) => {
                  const isInvitation = notification.type === 'workspace_invite'
                  const isAccepted = Boolean(notification.acceptedAt)

                  return (
                    <div
                      key={notification.id}
                      className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                          <Bell className="size-4" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium">
                              {isInvitation
                                ? 'Workspace invitation'
                                : formatNotificationType(notification.type)}
                            </p>
                            <Badge variant="outline">
                              {isAccepted
                                ? 'Accepted'
                                : notification.readAt
                                  ? 'Read'
                                  : 'New'}
                            </Badge>
                          </div>
                          <p className="text-muted-foreground text-sm">
                            {isInvitation
                              ? `${notification.senderName} invited you to join ${notification.workspaceName}.`
                              : `${notification.senderName} sent a notification for ${notification.workspaceName}.`}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatNotificationDate(notification.createdAt)}
                          </p>
                        </div>
                      </div>

                      {isInvitation && !isAccepted && (
                        <Button
                          variant="outline"
                          disabled={acceptNotification.isPending}
                          onClick={() =>
                            acceptNotification.mutate(notification.id, {
                              onSuccess: (response) => {
                                if (response.success) {
                                  toast.success('Invitation accepted.')
                                }
                              },
                            })
                          }
                        >
                          {acceptNotification.isPending && (
                            <Loader2 className="animate-spin" />
                          )}
                          Accept
                        </Button>
                      )}
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
