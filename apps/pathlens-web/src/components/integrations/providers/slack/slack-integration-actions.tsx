import { useEffect, useMemo, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { InfoIcon, SettingsIcon } from 'lucide-react'

import {
  useConnectSlack,
  useDisconnectSlack,
  useSaveSlackSettings,
  useSendSlackTestMessage,
} from '@/mutations/integrations'
import {
  getSlackChannelsOptions,
  getSlackSettingsOptions,
} from '@/queries/integrations'
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
import type { Integration } from '@workspace/contracts'
import type { IntegrationProviderProps } from '../../registry'

const formSchema = z.object({
  channelId: z.string(),
  dailyEnabled: z.boolean(),
  weeklyEnabled: z.boolean(),
  dailyHour: z.number().int().min(0).max(23),
  weeklyDay: z.number().int().min(0).max(6),
  weeklyHour: z.number().int().min(0).max(23),
  timezone: z.string().min(1),
})

const weeks = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
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
  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    ...getSlackChannelsOptions(workspaceId, projectId),
    enabled: integration.isConnected && open,
  })
  const { data: settingsData } = useQuery({
    ...getSlackSettingsOptions(workspaceId, projectId),
    enabled: integration.isConnected && open,
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

  const settings = settingsData?.data
  const formDefaults = useMemo(
    () => ({
      channelId: settings?.settings.channelId ?? '',
      dailyEnabled: settings?.settings.dailyEnabled ?? false,
      weeklyEnabled: settings?.settings.weeklyEnabled ?? false,
      dailyHour: settings?.settings.dailyHour ?? 9,
      weeklyDay: settings?.settings.weeklyDay ?? 1,
      weeklyHour: settings?.settings.weeklyHour ?? 9,
      timezone: settings?.settings.timezone ?? 'UTC',
    }),
    [settings]
  )
  const form = useForm({
    defaultValues: formDefaults,
    validators: { onSubmit: formSchema },
    onSubmit: ({ value }) =>
      saveSettings(value, { onSuccess: () => setOpen(false) }),
  })

  useEffect(() => {
    if (settings) form.reset(formDefaults)
  }, [form, formDefaults, settings])

  const channels = channelsData?.data.map((item) => ({
    value: item.id,
    label: `/${item.name}`,
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
          {integration.isConnected ? 'Disconnect Account' : 'Connect Account'}
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
                              {item.label}
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
                                  value={String(field.state.value)}
                                  onValueChange={(value) =>
                                    field.handleChange(Number(value))
                                  }
                                >
                                  <SelectTrigger
                                    id={field.name}
                                    className="w-full flex-1"
                                  >
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {weeks.map((day, index) => (
                                      <SelectItem
                                        key={day}
                                        value={String(index)}
                                      >
                                        {day}
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
              <Button
                disabled={!settings?.settings.channelId || sendingTestMessage}
                onClick={() => sendTestMessage()}
                variant="outline"
              >
                <LoadingSwap isLoading={sendingTestMessage}>
                  Send Test Message
                </LoadingSwap>
              </Button>
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
