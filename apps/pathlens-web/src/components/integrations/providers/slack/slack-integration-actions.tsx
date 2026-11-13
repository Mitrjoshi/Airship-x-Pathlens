import { useEffect, useMemo, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { HistoryIcon, InfoIcon, SettingsIcon } from 'lucide-react'

import {
  useConnectSlack,
  useDisconnectSlack,
  useInviteSlackToChannel,
  useSaveSlackSettings,
  useSendSlackTestMessage,
} from '@/mutations/integrations'
import {
  getSlackChannelsOptions,
  getSlackSettingsOptions,
  getSlackNotificationHistoryOptions,
} from '@/queries/integrations'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import { Field, FieldGroup, FieldLabel } from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Switch } from '@workspace/ui/components/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import {
  slackProjectSettingsDefaults,
  slackProjectSettingsSchema,
  type Integration,
} from '@workspace/contracts'
import type { IntegrationProviderProps } from '../../registry'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@workspace/ui/components/sheet'

const weeks = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 7 },
]

type Props = IntegrationProviderProps & {
  integration: Integration
}

export function SlackIntegrationActions({
  workspaceId,
  projectId,
  returnPath,
  integration,
}: Props) {
  const [open, setOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    ...getSlackChannelsOptions(workspaceId, projectId),
    enabled: integration.isConnected && open,
  })
  const { data: settingsData } = useQuery({
    ...getSlackSettingsOptions(workspaceId, projectId),
    enabled: integration.isConnected && open,
  })
  const historyQuery = useInfiniteQuery({
    ...getSlackNotificationHistoryOptions(workspaceId, projectId),
    enabled: integration.isConnected && historyOpen,
  })
  const { mutate: connect, isPending: connecting } = useConnectSlack(
    workspaceId,
    projectId
  )
  const { mutate: disconnect, isPending: disconnecting } = useDisconnectSlack(
    workspaceId,
    projectId
  )
  const { mutate: saveSettings, isPending: settingsPending } =
    useSaveSlackSettings(workspaceId, projectId)
  const { mutate: sendTestMessage, isPending: sendingTestMessage } =
    useSendSlackTestMessage(workspaceId, projectId)
  const { mutate: inviteSlack, isPending: invitingSlack } =
    useInviteSlackToChannel(workspaceId, projectId)

  const settings = settingsData?.data
  const formDefaults = useMemo(
    () => ({
      ...slackProjectSettingsDefaults,
      channelId: settings?.settings.channelId ?? '',
      dailyEnabled:
        settings?.settings.dailyEnabled ??
        slackProjectSettingsDefaults.dailyEnabled,
      weeklyEnabled:
        settings?.settings.weeklyEnabled ??
        slackProjectSettingsDefaults.weeklyEnabled,
      dailyHour:
        settings?.settings.dailyHour ?? slackProjectSettingsDefaults.dailyHour,
      weeklyDay:
        settings?.settings.weeklyDay ?? slackProjectSettingsDefaults.weeklyDay,
      weeklyHour:
        settings?.settings.weeklyHour ??
        slackProjectSettingsDefaults.weeklyHour,
      timezone:
        settings?.settings.timezone ?? slackProjectSettingsDefaults.timezone,
    }),
    [settings]
  )
  const form = useForm({
    defaultValues: formDefaults,
    validators: { onSubmit: slackProjectSettingsSchema },
    onSubmit: ({ value }) =>
      saveSettings(value, { onSuccess: () => setOpen(false) }),
  })

  useEffect(() => {
    if (settings) form.reset(formDefaults)
  }, [form, formDefaults, settings])

  const channels = channelsData?.data.map((item) => ({
    value: item.id,
    label: `/${item.name}`,
    isMember: item.isMember,
  }))

  return (
    <>
      <Button
        variant={integration.isConnected ? 'destructive' : 'default'}
        disabled={connecting || disconnecting}
        onClick={() =>
          integration.isConnected ? disconnect() : connect(returnPath)
        }
      >
        <LoadingSwap isLoading={connecting || disconnecting}>
          {integration.isConnected ? 'Disconnect' : 'Connect'}
        </LoadingSwap>
      </Button>
      {integration.isConnected && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger>
            <Button variant="outline">
              Configure
              <SettingsIcon />
            </Button>
          </DialogTrigger>
          <DialogContent className="w-full max-w-xl!">
            <DialogHeader>
              <DialogTitle>Configure</DialogTitle>
              <DialogDescription>
                Configure where this project sends future analytics summaries.
              </DialogDescription>
            </DialogHeader>
            <form
              id="slack-settings"
              onSubmit={(event) => {
                event.preventDefault()
                form.handleSubmit()
              }}
            >
              <FieldGroup className="space-y-4">
                <form.Field name="channelId">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={field.name}>
                        Slack Channel
                      </FieldLabel>
                      <Select
                        items={channels ?? []}
                        value={field.state.value}
                        onValueChange={(value) =>
                          field.handleChange(value as string)
                        }
                        disabled={channelsLoading}
                      >
                        <SelectTrigger
                          id={field.name}
                          className="w-full flex-1"
                        >
                          <SelectValue
                            placeholder={
                              channelsLoading
                                ? 'Loading...'
                                : 'Select a channel'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                          {channels?.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              <span className="flex w-full items-center justify-between gap-4">
                                <span>{item.label}</span>
                                {!item.isMember && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={invitingSlack}
                                    onPointerDown={(event) =>
                                      event.stopPropagation()
                                    }
                                    onClick={(event) => {
                                      event.preventDefault()
                                      event.stopPropagation()
                                      inviteSlack(item.value)
                                    }}
                                  >
                                    Invite
                                  </Button>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </form.Field>
                <FieldGroup className="flex flex-row items-center gap-4">
                  <form.Field name="dailyEnabled">
                    {(field) => (
                      <Field orientation="horizontal">
                        <div className="w-full">
                          <FieldLabel htmlFor={field.name}>
                            Daily Summary
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoIcon className="text-muted-foreground size-4" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Receive a daily overview of your website&apos;s
                                traffic, visitors, pageviews, and key events
                                directly in your Slack channel.
                              </TooltipContent>
                            </Tooltip>
                          </FieldLabel>
                        </div>
                        <Switch
                          id={field.name}
                          checked={field.state.value}
                          onCheckedChange={(checked) => {
                            field.handleChange(checked)
                            if (checked)
                              form.setFieldValue('weeklyEnabled', false)
                          }}
                        />
                      </Field>
                    )}
                  </form.Field>
                  <form.Field name="weeklyEnabled">
                    {(field) => (
                      <Field orientation="horizontal">
                        <div className="w-full">
                          <FieldLabel htmlFor={field.name}>
                            Weekly Summary
                            <Tooltip>
                              <TooltipTrigger>
                                <InfoIcon className="text-muted-foreground size-4" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Receive a weekly overview of your website&apos;s
                                performance, traffic trends, visitor activity,
                                and key events directly in your Slack channel.
                              </TooltipContent>
                            </Tooltip>
                          </FieldLabel>
                        </div>
                        <Switch
                          id={field.name}
                          checked={field.state.value}
                          onCheckedChange={(checked) => {
                            field.handleChange(checked)
                            if (checked)
                              form.setFieldValue('dailyEnabled', false)
                          }}
                        />
                      </Field>
                    )}
                  </form.Field>
                </FieldGroup>
                <form.Subscribe
                  selector={(state) =>
                    [
                      state.values.dailyEnabled,
                      state.values.weeklyEnabled,
                    ] as const
                  }
                >
                  {([dailyEnabled, weeklyEnabled]) => (
                    <FieldGroup className="flex flex-row items-center gap-4">
                      {dailyEnabled && (
                        <form.Field name="dailyHour">
                          {(field) => (
                            <HourField field={field} label="Daily Time" />
                          )}
                        </form.Field>
                      )}
                      {weeklyEnabled && (
                        <>
                          <form.Field name="weeklyDay">
                            {(field) => (
                              <Field>
                                <FieldLabel htmlFor={field.name}>
                                  Weekly Day
                                </FieldLabel>
                                <Select
                                  items={weeks}
                                  value={String(field.state.value)}
                                  onValueChange={(value) =>
                                    field.handleChange(Number(value))
                                  }
                                >
                                  <SelectTrigger
                                    id={field.name}
                                    className="w-full flex-1"
                                  >
                                    <SelectValue>
                                      {weeks.find(
                                        (day) => day.value === field.state.value
                                      )?.label ?? 'Select day'}
                                    </SelectValue>
                                  </SelectTrigger>

                                  <SelectContent>
                                    {weeks.map((day) => (
                                      <SelectItem
                                        key={day.value}
                                        value={String(day.value)}
                                      >
                                        {day.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </Field>
                            )}
                          </form.Field>
                          <form.Field name="weeklyHour">
                            {(field) => (
                              <HourField field={field} label="Weekly Time" />
                            )}
                          </form.Field>
                        </>
                      )}
                      {(dailyEnabled || weeklyEnabled) && (
                        <form.Field name="timezone">
                          {(field) => (
                            <Field>
                              <FieldLabel htmlFor={field.name}>
                                Timezone
                              </FieldLabel>
                              <Input
                                id={field.name}
                                value={field.state.value}
                                onChange={(event) =>
                                  field.handleChange(event.target.value)
                                }
                              />
                            </Field>
                          )}
                        </form.Field>
                      )}
                    </FieldGroup>
                  )}
                </form.Subscribe>
              </FieldGroup>
            </form>
            <DialogFooter className="flex items-center justify-between! bg-transparent">
              <form.Subscribe selector={(state) => state.values.channelId}>
                {(channelId) => (
                  <Button
                    disabled={!channelId || sendingTestMessage}
                    onClick={() => sendTestMessage({ channelId })}
                    variant="outline"
                  >
                    <LoadingSwap isLoading={sendingTestMessage}>
                      Send Test Message
                    </LoadingSwap>
                  </Button>
                )}
              </form.Subscribe>
              <div className="flex items-center gap-2">
                <DialogClose>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button
                  disabled={settingsPending}
                  form="slack-settings"
                  type="submit"
                >
                  <LoadingSwap isLoading={settingsPending}>Save</LoadingSwap>
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {integration.isConnected && (
        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
          <SheetTrigger
            render={
              <Button variant="outline">
                View History
                <HistoryIcon />
              </Button>
            }
          />

          <SheetContent className="flex w-full max-w-lg! flex-col gap-0 p-0">
            <SheetHeader className="border-b">
              <SheetTitle className="text-lg">Notification History</SheetTitle>

              <SheetDescription>
                View past Slack notifications, delivery statuses, and report
                details for this project.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {historyQuery.isLoading && (
                <p className="text-muted-foreground text-sm">
                  Loading notification history...
                </p>
              )}

              {historyQuery.isError && (
                <div className="space-y-3">
                  <p className="text-destructive text-sm">
                    Unable to load notification history.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => historyQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              )}

              {historyQuery.data?.pages[0]?.data.items.length === 0 && (
                <div className="space-y-1">
                  <p className="font-medium">No notifications yet</p>
                  <p className="text-muted-foreground text-sm">
                    Your Slack notification history will appear here once your
                    first report has been sent.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {historyQuery.data?.pages.flatMap((page) =>
                  page.data.items.map((notification) => (
                    <div
                      className="space-y-2 rounded-md border p-4"
                      key={notification.id}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">
                          {notification.reportType === 'daily'
                            ? 'Daily'
                            : 'Weekly'}{' '}
                          report
                        </p>
                        <Badge
                          variant={
                            notification.status === 'delivered'
                              ? 'secondary'
                              : notification.status === 'failed' ||
                                  notification.status === 'delivery_unconfirmed'
                                ? 'destructive'
                                : 'outline'
                          }
                        >
                          {notification.status === 'delivery_unconfirmed'
                            ? 'Delivery unconfirmed'
                            : notification.status === 'pending'
                              ? 'Pending'
                              : notification.status === 'processing'
                                ? 'Processing'
                                : notification.status === 'delivered'
                                  ? 'Delivered'
                                  : notification.status === 'retrying'
                                    ? 'Retrying'
                                    : 'Failed'}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Scheduled{' '}
                        {new Date(notification.scheduledAt).toLocaleString()}
                      </p>
                      {notification.deliveredAt && (
                        <p className="text-muted-foreground text-sm">
                          Delivered{' '}
                          {new Date(notification.deliveredAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>

              {historyQuery.hasNextPage && (
                <Button
                  className="mt-4 w-full"
                  disabled={historyQuery.isFetchingNextPage}
                  variant="outline"
                  onClick={() => historyQuery.fetchNextPage()}
                >
                  {historyQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}

type HourFieldProps = {
  field: {
    name: string
    state: { value: number }
    handleChange: (value: number) => void
  }
  label: string
}

function HourField({ field, label }: HourFieldProps) {
  return (
    <Field>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        value={String(field.state.value)}
        onValueChange={(value) => field.handleChange(Number(value))}
      >
        <SelectTrigger id={field.name} className="w-full flex-1">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 24 }, (_, hour) => (
            <SelectItem key={hour} value={String(hour)}>
              {String(hour).padStart(2, '0')}:00
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
