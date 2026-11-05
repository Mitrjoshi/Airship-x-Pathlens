import { createFileRoute } from '@tanstack/react-router'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
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
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { EllipsisIcon, SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  connectSlack,
  disconnectSlack,
  getSlackChannelsOptions,
  getSlackSettingsOptions,
  getProjectIntegrationsOptions,
  saveSlackSettings,
  sendSlackTestMessage,
} from '@/queries/integrations'
import type { SlackProjectSettings } from '@workspace/contracts'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { ErrorScreen } from './-components/common/error-screen'
import { toast } from 'sonner'
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
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import { Input } from '@workspace/ui/components/input'
import { Label } from '@workspace/ui/components/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Switch } from '@workspace/ui/components/switch'
export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/integrations'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId, workspaceId } = Route.useParams()
  const [search, setSearch] = useState('')
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [channelSearch, setChannelSearch] = useState('')
  const [settings, setSettings] = useState<SlackProjectSettings>({
    channelId: '',
    dailyEnabled: false,
    weeklyEnabled: false,
    dailyHour: 9,
    weeklyDay: 1,
    weeklyHour: 9,
    timezone: 'UTC',
  })
  const [savedSettings, setSavedSettings] = useState('')
  const queryClient = useQueryClient()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const slackStatus = params.get('slack')
    if (slackStatus === 'connected') toast.success('Slack connected.')
    if (slackStatus === 'error') {
      toast.error(params.get('message') ?? 'Unable to connect Slack.')
    }
    if (slackStatus)
      window.history.replaceState({}, document.title, window.location.pathname)
  }, [])

  const {
    data: integrationsData,
    isLoading: integrationLoading,
    isError: integrationError,
    refetch: integrationsRefetch,
    isRefetching: integrationsRefetching,
  } = useQuery(getProjectIntegrationsOptions(workspaceId, projectId))

  const slackIntegration = integrationsData?.data.find(
    (integration) => integration.slug === 'slack'
  )
  const slackConnected = slackIntegration?.connection?.status === 'connected'
  const { data: slackChannelsData, isLoading: channelsLoading } = useQuery(
    getSlackChannelsOptions(workspaceId, projectId, Boolean(slackConnected))
  )
  const { data: slackSettingsData } = useQuery(
    getSlackSettingsOptions(workspaceId, projectId, Boolean(slackConnected))
  )

  useEffect(() => {
    if (slackSettingsData?.data.settings) {
      setSettings({
        ...slackSettingsData.data.settings,
        channelId: slackSettingsData.data.settings.channelId ?? '',
      })
      setSavedSettings(
        JSON.stringify({
          ...slackSettingsData.data.settings,
          channelId: slackSettingsData.data.settings.channelId ?? '',
        })
      )
    }
  }, [slackSettingsData])

  const { mutate: disconnectMutation, isPending: disconnectPending } =
    useMutation({
      mutationFn: () => disconnectSlack(workspaceId, projectId),
      onSuccess: async () => {
        setDisconnectOpen(false)
        await queryClient.invalidateQueries({
          queryKey: ['PROJECT_INTEGRATIONS', workspaceId, projectId],
        })
      },
      onError: (error) => {
        toast.error(error.message)
      },
    })

  const startSlackConnection = async () => {
    setConnecting(true)
    try {
      await connectSlack(workspaceId, projectId, window.location.pathname)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to connect Slack.'
      )
      setConnecting(false)
    }
  }

  const saveSettingsMutation = useMutation({
    mutationFn: () => saveSlackSettings(workspaceId, projectId, settings),
    onSuccess: () => {
      toast.success('Slack settings saved.')
      setSavedSettings(JSON.stringify(settings))
      void queryClient.invalidateQueries({
        queryKey: ['PROJECT_SLACK_SETTINGS', workspaceId, projectId],
      })
    },
    onError: (error) => toast.error(error.message),
  })

  const testMessageMutation = useMutation({
    mutationFn: () => sendSlackTestMessage(workspaceId, projectId),
    onSuccess: () => toast.success('Test message sent to Slack.'),
    onError: (error) => toast.error(error.message),
  })

  const integrations = integrationsData?.data
  const visibleChannels = (slackChannelsData?.data ?? []).filter((channel) =>
    channel.name.toLowerCase().includes(channelSearch.toLowerCase())
  )
  const selectedChannelMissing =
    Boolean(settings.channelId) &&
    Boolean(slackChannelsData) &&
    !slackChannelsData?.data.some(
      (channel) => channel.id === settings.channelId
    )
  const settingsDirty = savedSettings !== JSON.stringify(settings)

  const searchedIntegrations = (integrations ?? []).filter((integration) =>
    integration.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mx-auto space-y-4 p-6">
        <div>
          <p className="text-xl font-medium">Integrations</p>
          <p className="text-muted-foreground text-sm">
            Connect your favorite tools to extend Pathlens.
          </p>
        </div>

        {integrationError && !integrationLoading ? (
          <>
            <ErrorScreen
              refetch={integrationsRefetch}
              refetching={integrationsRefetching}
              project_id={projectId}
              workspace_id={workspaceId}
            />
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <InputGroup className="w-120">
                <InputGroupButton>
                  <SearchIcon />
                </InputGroupButton>

                <InputGroupInput
                  onChange={(e) => {
                    setSearch(e.target.value)
                  }}
                  placeholder="Search..."
                />
              </InputGroup>
            </div>

            {integrationLoading ? (
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, index) => (
                  <Card
                    className="bg-card/30 rounded-none border-2 border-dashed"
                    key={index}
                  >
                    <CardHeader className="space-y-4">
                      <Skeleton className="size-12" />
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="h-10 w-full" />
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : searchedIntegrations.length > 0 ? (
              <div className="grid grid-cols-4 gap-4">
                {searchedIntegrations.map((item) => (
                  <Card
                    className="bg-card/30 rounded-none border-2 border-dashed duration-200"
                    key={item.id}
                  >
                    <CardContent className="p-0">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <Avatar size="lg">
                            <AvatarImage src={item.iconUrl ?? undefined} />
                            <AvatarFallback>
                              {item.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{item.category}</Badge>
                            <Dialog>
                              <DialogTrigger>
                                <Button variant={'ghost'} size="icon">
                                  <EllipsisIcon />
                                </Button>
                              </DialogTrigger>

                              <DialogContent className={'w-full max-w-3xl!'}>
                                <div className="space-y-6">
                                  <DialogHeader>
                                    <DialogTitle>Slack settings</DialogTitle>
                                    <DialogDescription>
                                      Configure where this project sends future
                                      analytics summaries.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-6">
                                    <div className="space-y-2">
                                      <Label>Destination channel</Label>
                                      <Input
                                        value={channelSearch}
                                        onChange={(event) =>
                                          setChannelSearch(event.target.value)
                                        }
                                        placeholder="Search public channels..."
                                      />
                                      <Select
                                        value={settings.channelId}
                                        onValueChange={(value) =>
                                          setSettings((current) => ({
                                            ...current,
                                            channelId: value ?? '',
                                          }))
                                        }
                                      >
                                        <SelectTrigger className="w-full">
                                          <SelectValue
                                            placeholder={
                                              channelsLoading
                                                ? 'Loading channels...'
                                                : 'Select a channel'
                                            }
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {visibleChannels.map((channel) => (
                                            <SelectItem
                                              key={channel.id}
                                              value={channel.id}
                                            >
                                              #{channel.name}
                                              {!channel.isMember
                                                ? ' (invite @Pathlens first)'
                                                : ''}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      {selectedChannelMissing ? (
                                        <p className="text-destructive text-xs">
                                          The saved channel is no longer
                                          available. Select a new channel.
                                        </p>
                                      ) : null}
                                      {!channelsLoading &&
                                      slackChannelsData?.data.length === 0 ? (
                                        <p className="text-muted-foreground text-xs">
                                          No public Slack channels are
                                          available. Invite @Pathlens to a
                                          channel, then refresh.
                                        </p>
                                      ) : null}
                                      <p className="text-muted-foreground text-xs">
                                        Only public channels where @Pathlens is
                                        a member can receive messages.
                                      </p>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                      <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
                                        <span>Daily summary</span>
                                        <Switch
                                          checked={settings.dailyEnabled}
                                          onCheckedChange={(checked) =>
                                            setSettings((current) => ({
                                              ...current,
                                              dailyEnabled: checked,
                                            }))
                                          }
                                        />
                                      </label>
                                      <label className="flex items-center justify-between rounded-lg border p-3 text-sm">
                                        <span>Weekly summary</span>
                                        <Switch
                                          checked={settings.weeklyEnabled}
                                          onCheckedChange={(checked) =>
                                            setSettings((current) => ({
                                              ...current,
                                              weeklyEnabled: checked,
                                            }))
                                          }
                                        />
                                      </label>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-3">
                                      <div className="space-y-2">
                                        <Label>Daily time</Label>
                                        <Select
                                          value={String(settings.dailyHour)}
                                          onValueChange={(value) =>
                                            setSettings((current) => ({
                                              ...current,
                                              dailyHour: Number(value),
                                            }))
                                          }
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Array.from(
                                              { length: 24 },
                                              (_, hour) => (
                                                <SelectItem
                                                  key={hour}
                                                  value={String(hour)}
                                                >
                                                  {String(hour).padStart(
                                                    2,
                                                    '0'
                                                  )}
                                                  :00
                                                </SelectItem>
                                              )
                                            )}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Weekly day</Label>
                                        <Select
                                          value={String(settings.weeklyDay)}
                                          onValueChange={(value) =>
                                            setSettings((current) => ({
                                              ...current,
                                              weeklyDay: Number(value),
                                            }))
                                          }
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {[
                                              'Monday',
                                              'Tuesday',
                                              'Wednesday',
                                              'Thursday',
                                              'Friday',
                                              'Saturday',
                                              'Sunday',
                                            ].map((day, index) => (
                                              <SelectItem
                                                key={day}
                                                value={String(index + 1)}
                                              >
                                                {day}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label>Weekly time</Label>
                                        <Select
                                          value={String(settings.weeklyHour)}
                                          onValueChange={(value) =>
                                            setSettings((current) => ({
                                              ...current,
                                              weeklyHour: Number(value),
                                            }))
                                          }
                                        >
                                          <SelectTrigger className="w-full">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Array.from(
                                              { length: 24 },
                                              (_, hour) => (
                                                <SelectItem
                                                  key={hour}
                                                  value={String(hour)}
                                                >
                                                  {String(hour).padStart(
                                                    2,
                                                    '0'
                                                  )}
                                                  :00
                                                </SelectItem>
                                              )
                                            )}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label htmlFor="slack-timezone">
                                        Timezone
                                      </Label>
                                      <Input
                                        id="slack-timezone"
                                        value={settings.timezone}
                                        onChange={(event) =>
                                          setSettings((current) => ({
                                            ...current,
                                            timezone: event.target.value,
                                          }))
                                        }
                                        placeholder="Asia/Kolkata"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <DialogFooter className="justify-between gap-2 bg-transparent py-2">
                                  <Button
                                    variant="outline"
                                    onClick={() => testMessageMutation.mutate()}
                                    disabled={
                                      !settings.channelId ||
                                      testMessageMutation.isPending
                                    }
                                  >
                                    <LoadingSwap
                                      isLoading={testMessageMutation.isPending}
                                    >
                                      Send test message
                                    </LoadingSwap>
                                  </Button>
                                  <Button
                                    onClick={() =>
                                      saveSettingsMutation.mutate()
                                    }
                                    disabled={
                                      !settings.channelId ||
                                      !settingsDirty ||
                                      saveSettingsMutation.isPending
                                    }
                                  >
                                    <LoadingSwap
                                      isLoading={saveSettingsMutation.isPending}
                                    >
                                      Save changes
                                    </LoadingSwap>
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <CardTitle>{item.name}</CardTitle>
                          {item.connection?.status === 'connected' ? (
                            <Badge>Connected</Badge>
                          ) : null}
                        </div>
                        <CardDescription>{item.description}</CardDescription>
                        {item.connection?.status === 'connected' ? (
                          <p className="text-muted-foreground mt-2 text-sm">
                            Slack Workspace:{' '}
                            <span className="text-foreground font-medium">
                              {item.connection.providerWorkspaceName}
                            </span>
                          </p>
                        ) : null}
                      </CardHeader>
                    </CardContent>

                    <CardFooter className="rounded-none border-t-2 border-dashed bg-transparent p-2">
                      <Button
                        variant={
                          item.connection?.status === 'connected'
                            ? 'destructive'
                            : 'outline'
                        }
                        className="w-full"
                        disabled={item.status !== 'available' || connecting}
                        onClick={() => {
                          if (item.slug !== 'slack') return
                          if (item.connection?.status === 'connected') {
                            setDisconnectOpen(true)
                            return
                          }
                          void startSlackConnection()
                        }}
                      >
                        <LoadingSwap isLoading={connecting}>
                          {item.status === 'coming_soon'
                            ? 'Coming soon'
                            : item.status === 'disabled'
                              ? 'Disabled'
                              : item.connection?.status === 'connected'
                                ? 'Disconnect'
                                : item.connection?.status === 'error'
                                  ? 'Reconnect'
                                  : 'Connect'}
                        </LoadingSwap>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="mt-40 text-center">
                <p className="text-muted-foreground">No integrations found.</p>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disconnect Slack?</DialogTitle>
            <DialogDescription>
              Pathlens will revoke the Slack token where possible and remove its
              local credentials.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-transparent py-2">
            <DialogClose render={<Button variant={'outline'} />}>
              Cancel
            </DialogClose>
            <Button
              variant={'destructive'}
              onClick={() => disconnectMutation()}
              disabled={disconnectPending}
            >
              <LoadingSwap isLoading={disconnectPending}>
                Disconnect
              </LoadingSwap>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
