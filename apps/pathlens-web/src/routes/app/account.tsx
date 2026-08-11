import { AppHeader } from '@/components/common/app-header'
import { PageHeader, PageLayout } from '@/components/common/page-layout'
import { createFileRoute, useRouteContext } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { z } from 'zod'
import { useState } from 'react'
import {
  Camera,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  Shield,
  Smartphone,
  Trash2,
} from 'lucide-react'

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
import { Switch } from '@workspace/ui/components/switch'
import { Avatar, AvatarFallback } from '@workspace/ui/components/avatar'
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
  name: z.string().min(2, 'Name must be at least 2 characters'),
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

interface Session {
  id: string
  device: string
  location: string
  lastActive: string
  current: boolean
}

const sessions: Session[] = [
  {
    id: 's_1',
    device: 'MacBook Pro · Chrome',
    location: 'Mumbai, IN',
    lastActive: 'Active now',
    current: true,
  },
  {
    id: 's_2',
    device: 'iPhone 15 · Safari',
    location: 'Mumbai, IN',
    lastActive: '2 hours ago',
    current: false,
  },
  {
    id: 's_3',
    device: 'Windows PC · Edge',
    location: 'Pune, IN',
    lastActive: '3 days ago',
    current: false,
  },
]

const notificationSettings = [
  {
    id: 'weekly-summary',
    label: 'Weekly Summary',
    description: 'A digest of your analytics performance every Monday.',
    defaultChecked: true,
  },
  {
    id: 'traffic-spikes',
    label: 'Traffic Spike Alerts',
    description: 'Get notified when a project sees unusual traffic.',
    defaultChecked: true,
  },
  {
    id: 'team-activity',
    label: 'Team Activity',
    description: 'When members join, leave, or change roles.',
    defaultChecked: false,
  },
  {
    id: 'product-updates',
    label: 'Product Updates',
    description: 'New features and improvements to PathLens.',
    defaultChecked: true,
  },
]

function RouteComponent() {
  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)

  const profileForm = useForm({
    defaultValues: {
      name: 'Mitr Patel',
      email: 'mitr@pathlens.io',
    },
    validators: {
      onChange: profileSchema,
    },
    onSubmit: async ({ value }) => {
      setIsSavingProfile(true)
      // TODO: wire to update-account mutation
      await new Promise((resolve) => setTimeout(resolve, 800))
      console.log(value)
      setIsSavingProfile(false)
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
      setIsSavingPassword(true)
      // TODO: wire to change-password mutation
      await new Promise((resolve) => setTimeout(resolve, 800))
      console.log(value)
      passwordForm.reset()
      setIsSavingPassword(false)
    },
  })

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
                <AvatarFallback className="text-lg">MP</AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="font-medium">Personal avatar</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Use a clear image so teammates can recognize you.
                </p>
              </div>

              <Button variant="outline" className="self-start sm:self-center">
                <Camera />
                Change photo
              </Button>
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
                      disabled={!canSubmit || isSavingProfile}
                    >
                      {(isSubmitting || isSavingProfile) && (
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
                Permanently delete your account and all associated data. This
                does not delete workspaces you own — transfer or delete those
                first.
              </CardDescription>
            </CardHeader>

            <CardFooter className="p-5">
              <Dialog>
                <DialogTrigger
                  render={
                    <Button variant="destructive">Delete My Account</Button>
                  }
                />

                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete your account?</DialogTitle>
                    <DialogDescription>
                      This action is permanent and cannot be undone. All your
                      personal data will be removed.
                    </DialogDescription>
                  </DialogHeader>

                  <DialogFooter>
                    <Button variant="destructive">
                      I understand, delete my account
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
                      disabled={!canSubmit || isSavingPassword}
                    >
                      {(isSubmitting || isSavingPassword) && (
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
                    Add an extra layer of security to your account.
                  </CardDescription>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                {twoFactorEnabled && (
                  <Badge className="bg-green-500/15 text-green-600 hover:bg-green-500/15">
                    Enabled
                  </Badge>
                )}
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={setTwoFactorEnabled}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="py-0">
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>Active sessions</CardTitle>
              <CardDescription>
                Devices currently signed in to your account.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 p-5">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="bg-muted flex size-9 shrink-0 items-center justify-center rounded-lg">
                      {session.device.includes('iPhone') ? (
                        <Smartphone className="text-muted-foreground size-4" />
                      ) : (
                        <Laptop className="text-muted-foreground size-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                        {session.device}
                        {session.current && (
                          <Badge variant="outline">This device</Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {session.location} · {session.lastActive}
                      </div>
                    </div>
                  </div>

                  {!session.current && (
                    <Button
                      variant="ghost"
                      className="self-start sm:self-center"
                    >
                      <LogOut />
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="py-0">
            <CardHeader className="border-b px-5 py-5">
              <CardTitle>Notification preferences</CardTitle>
              <CardDescription>
                Choose what you want to be notified about.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 p-5">
              {notificationSettings.map((setting) => (
                <div
                  key={setting.id}
                  className="flex items-center justify-between gap-4 rounded-xl border p-4 sm:p-5"
                >
                  <div className="min-w-0 space-y-0.5">
                    <Label htmlFor={setting.id}>{setting.label}</Label>
                    <p className="text-muted-foreground text-sm">
                      {setting.description}
                    </p>
                  </div>

                  <Switch
                    id={setting.id}
                    defaultChecked={setting.defaultChecked}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
