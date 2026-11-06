import {
  useConnectSlack,
  useDisconnectSlack,
  useSaveSlackSettings,
  useSendSlackTestMessage,
} from '@/mutations/integrations'
import {
  getIntegrationByIdOptions,
  getSlackChannelsOptions,
  getSlackSettingsOptions,
} from '@/queries/integrations'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import Markdown from 'react-markdown'
import { Button } from '@workspace/ui/components/button'
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  FileTextIcon,
  GlobeIcon,
  HandshakeIcon,
  HeadphonesIcon,
  InfoIcon,
  KeyRoundIcon,
  SettingsIcon,
} from 'lucide-react'
import { formatNumber } from '@/utils/utils'
import { useEffect, useMemo, useState } from 'react'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Separator } from '@workspace/ui/components/separator'
import type { ReactNode } from 'react'
import { ErrorScreen } from '../-components/common/error-screen'
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
import { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Switch } from '@workspace/ui/components/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/integrations/$integrationId'
)({
  component: RouteComponent,
})

const formSchema = z.object({
  channelId: z.string(),
  dailyEnabled: z.boolean(),
  weeklyEnabled: z.boolean(),
  dailyHour: z.number().int().min(0).max(23),
  weeklyDay: z.number().int().min(0).max(6),
  weeklyHour: z.number().int().min(0).max(23),
  timezone: z.string().min(1),
})

/* Index matches weeklyDay (0 = Sunday ... 6 = Saturday). */
const weeks = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]

function ResourceLink({
  href,
  icon,
  children,
}: {
  href: string | null | undefined
  icon: ReactNode
  children: ReactNode
}) {
  const className = 'text-muted-foreground hover:text-foreground px-0'

  if (!href) {
    return (
      <Button variant="link" className={className} disabled>
        {icon}
        {children}
      </Button>
    )
  }

  return (
    <Button
      render={
        <a href={href} target="_blank" rel="noopener noreferrer">
          {icon}
          {children}
        </a>
      }
      variant="link"
      className={className}
    />
  )
}

function RouteComponent() {
  const { workspaceId, projectId, integrationId } = Route.useParams()
  const navigate = useNavigate()

  const [selectedAsset, setSelectedAsset] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const {
    data: integrationData,
    isLoading: integrationLoading,
    error: integrationError,
    refetch: integrationRefetch,
    isRefetching: integrationRefetching,
  } = useQuery(getIntegrationByIdOptions(integrationId, projectId))

  const integration = integrationData?.data

  const { data: slackChannelsData, isLoading: channelsLoading } = useQuery({
    ...getSlackChannelsOptions(workspaceId, projectId),
    enabled: !!integration?.isConnected && !!open,
  })
  const { data: slackSettingsData } = useQuery({
    ...getSlackSettingsOptions(workspaceId, projectId),
    enabled: !!integration?.isConnected && !!open,
  })

  const channelsData = slackChannelsData?.data
  const slackSettings = slackSettingsData?.data

  const { mutate: connectSlack, isPending: slackConnecting } = useConnectSlack(
    workspaceId,
    projectId
  )
  const { mutate: disconnectSlack, isPending: slackDisconnecting } =
    useDisconnectSlack(workspaceId, projectId)
  const { mutate: sendTestSlackMessage, isPending: sendingTestMessage } =
    useSendSlackTestMessage(workspaceId, projectId)
  const { mutate: saveSlackSettings, isPending: slackSettingsPending } =
    useSaveSlackSettings(workspaceId, projectId)

  const activeAsset = selectedAsset || integration?.assets[0]

  const slackIntegration = integration?.slug === 'slack'

  const channels = channelsData?.map((item) => ({
    value: item.id,
    label: `/${item.name}`,
  }))

  /*
   * ?? instead of || so a saved hour of 0
   * (midnight) is not replaced by the default.
   */
  const formDefaults = useMemo(
    () => ({
      channelId: slackSettings?.settings?.channelId ?? '',
      dailyEnabled: slackSettings?.settings?.dailyEnabled ?? false,
      weeklyEnabled: slackSettings?.settings?.weeklyEnabled ?? false,
      dailyHour: slackSettings?.settings?.dailyHour ?? 9,
      weeklyDay: slackSettings?.settings?.weeklyDay ?? 1,
      weeklyHour: slackSettings?.settings?.weeklyHour ?? 9,
      timezone: slackSettings?.settings?.timezone ?? 'UTC',
    }),
    [slackSettings]
  )

  const form = useForm({
    defaultValues: formDefaults,
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: ({ value }) => {
      saveSlackSettings(
        {
          ...value,
        },
        {
          onSuccess: () => {
            setOpen(false)
          },
        }
      )
    },
  })

  /*
   * Settings load after the form is created,
   * so push them into the form once they arrive.
   */
  useEffect(() => {
    if (slackSettings?.settings) {
      form.reset(formDefaults)
    }
  }, [form, formDefaults, slackSettings])

  return (
    <div>
      <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Back to goals"
          onClick={() =>
            navigate({
              to: '/app/$workspaceId/$projectId/integrations',
              params: {
                workspaceId,
                projectId,
              },
            })
          }
        >
          <ArrowLeftIcon />
        </Button>

        <div className="flex items-center gap-2">
          {!integrationLoading && (
            <>
              <Button
                variant={integration?.isConnected ? 'destructive' : 'default'}
                disabled={slackConnecting || slackDisconnecting}
                onClick={() => {
                  if (integration?.isConnected) {
                    disconnectSlack()
                  } else {
                    connectSlack(window.location.pathname)
                  }
                }}
              >
                <LoadingSwap isLoading={slackConnecting || slackDisconnecting}>
                  {integration?.isConnected
                    ? 'Disconnect Account'
                    : 'Connect Account'}
                </LoadingSwap>
              </Button>
              {integration?.isConnected && slackIntegration && (
                <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
                  <DialogTrigger>
                    <Button variant={'outline'}>
                      Configure
                      <SettingsIcon />
                    </Button>
                  </DialogTrigger>

                  <DialogContent className={'w-full max-w-xl!'}>
                    <DialogHeader>
                      <DialogTitle>Configure</DialogTitle>
                      <DialogDescription>
                        Configure where this project sends future analytics
                        summaries.
                      </DialogDescription>
                    </DialogHeader>

                    <form
                      id="slack-settings"
                      onSubmit={(e) => {
                        e.preventDefault()
                        form.handleSubmit()
                      }}
                    >
                      <FieldGroup className="space-y-4">
                        <form.Field
                          name="channelId"
                          children={(field) => {
                            const isInvalid =
                              field.state.meta.isTouched &&
                              !field.state.meta.isValid

                            return (
                              <Field data-invalid={isInvalid}>
                                <FieldLabel htmlFor={field.name}>
                                  Slack Channel
                                </FieldLabel>

                                <Select
                                  items={channels ?? []}
                                  value={field.state.value}
                                  onValueChange={(e) => {
                                    field.handleChange(e as string)
                                  }}
                                  disabled={channelsLoading}
                                >
                                  <SelectTrigger
                                    id={field.name}
                                    className="w-full flex-1"
                                    aria-invalid={isInvalid}
                                    onBlur={field.handleBlur}
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
                                    {channels?.length ? (
                                      channels.map((item) => (
                                        <SelectItem
                                          key={item.value}
                                          value={item.value}
                                        >
                                          {item.label}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="flex w-full items-center justify-center py-5">
                                        <p className="text-muted-foreground text-sm">
                                          No Channels Found.
                                        </p>
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>

                                {isInvalid && (
                                  <FieldError
                                    errors={field.state.meta.errors}
                                  />
                                )}
                              </Field>
                            )
                          }}
                        />

                        <FieldGroup className="flex flex-row items-center gap-4">
                          <form.Field
                            name="dailyEnabled"
                            children={(field) => {
                              const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                              return (
                                <Field
                                  orientation={'horizontal'}
                                  data-invalid={isInvalid}
                                >
                                  <div className="w-full">
                                    <FieldLabel htmlFor={field.name}>
                                      Daily Summary
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <InfoIcon className="text-muted-foreground size-4" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Receive a daily overview of your
                                          website's traffic, visitors,
                                          pageviews, and key events directly in
                                          your Slack channel.
                                        </TooltipContent>
                                      </Tooltip>
                                    </FieldLabel>
                                    {isInvalid && (
                                      <FieldError
                                        errors={field.state.meta.errors}
                                      />
                                    )}
                                  </div>

                                  <Switch
                                    id={field.name}
                                    name={field.name}
                                    checked={field.state.value}
                                    onCheckedChange={(checked) => {
                                      field.handleChange(checked)

                                      // Daily and weekly are mutually exclusive.
                                      if (checked) {
                                        form.setFieldValue(
                                          'weeklyEnabled',
                                          false
                                        )
                                      }
                                    }}
                                    onBlur={field.handleBlur}
                                    aria-invalid={isInvalid}
                                  />
                                </Field>
                              )
                            }}
                          />
                          <form.Field
                            name="weeklyEnabled"
                            children={(field) => {
                              const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid

                              return (
                                <Field
                                  orientation={'horizontal'}
                                  data-invalid={isInvalid}
                                >
                                  <div className="w-full">
                                    <FieldLabel htmlFor={field.name}>
                                      Weekly Summary
                                      <Tooltip>
                                        <TooltipTrigger>
                                          <InfoIcon className="text-muted-foreground size-4" />
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Receive a weekly overview of your
                                          website's performance, traffic trends,
                                          visitor activity, and key events
                                          directly in your Slack channel.
                                        </TooltipContent>
                                      </Tooltip>
                                    </FieldLabel>
                                    {isInvalid && (
                                      <FieldError
                                        errors={field.state.meta.errors}
                                      />
                                    )}
                                  </div>

                                  <Switch
                                    id={field.name}
                                    name={field.name}
                                    checked={field.state.value}
                                    onCheckedChange={(checked) => {
                                      field.handleChange(checked)

                                      // Daily and weekly are mutually exclusive.
                                      if (checked) {
                                        form.setFieldValue(
                                          'dailyEnabled',
                                          false
                                        )
                                      }
                                    }}
                                    onBlur={field.handleBlur}
                                    aria-invalid={isInvalid}
                                  />
                                </Field>
                              )
                            }}
                          />
                        </FieldGroup>

                        {/*
                         * Schedule fields.
                         * Only the fields for the enabled
                         * summary are rendered.
                         */}
                        <form.Subscribe
                          selector={(state) =>
                            [
                              state.values.dailyEnabled,
                              state.values.weeklyEnabled,
                            ] as const
                          }
                          children={([dailyEnabled, weeklyEnabled]) => {
                            if (!dailyEnabled && !weeklyEnabled) return null

                            return (
                              <FieldGroup className="flex flex-row items-center gap-4">
                                {dailyEnabled && (
                                  <form.Field
                                    name="dailyHour"
                                    children={(field) => {
                                      const isInvalid =
                                        field.state.meta.isTouched &&
                                        !field.state.meta.isValid

                                      return (
                                        <Field data-invalid={isInvalid}>
                                          <FieldLabel htmlFor={field.name}>
                                            Daily Time
                                          </FieldLabel>

                                          <Select
                                            value={String(field.state.value)}
                                            onValueChange={(e) => {
                                              field.handleChange(Number(e))
                                            }}
                                          >
                                            <SelectTrigger
                                              id={field.name}
                                              className="w-full flex-1"
                                              aria-invalid={isInvalid}
                                              onBlur={field.handleBlur}
                                            >
                                              <SelectValue />
                                            </SelectTrigger>

                                            <SelectContent
                                              alignItemWithTrigger={false}
                                            >
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

                                          {isInvalid && (
                                            <FieldError
                                              errors={field.state.meta.errors}
                                            />
                                          )}
                                        </Field>
                                      )
                                    }}
                                  />
                                )}

                                {weeklyEnabled && (
                                  <>
                                    <form.Field
                                      name="weeklyDay"
                                      children={(field) => {
                                        const isInvalid =
                                          field.state.meta.isTouched &&
                                          !field.state.meta.isValid

                                        return (
                                          <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                              Weekly Day
                                            </FieldLabel>

                                            <Select
                                              value={weeks[field.state.value]}
                                              onValueChange={(e) => {
                                                field.handleChange(Number(e))
                                              }}
                                            >
                                              <SelectTrigger
                                                id={field.name}
                                                className="w-full flex-1"
                                                aria-invalid={isInvalid}
                                                onBlur={field.handleBlur}
                                              >
                                                <SelectValue />
                                              </SelectTrigger>

                                              <SelectContent
                                                alignItemWithTrigger={false}
                                              >
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

                                            {isInvalid && (
                                              <FieldError
                                                errors={field.state.meta.errors}
                                              />
                                            )}
                                          </Field>
                                        )
                                      }}
                                    />
                                    <form.Field
                                      name="weeklyHour"
                                      children={(field) => {
                                        const isInvalid =
                                          field.state.meta.isTouched &&
                                          !field.state.meta.isValid

                                        return (
                                          <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor={field.name}>
                                              Weekly Time
                                            </FieldLabel>

                                            <Select
                                              value={String(field.state.value)}
                                              onValueChange={(e) => {
                                                field.handleChange(Number(e))
                                              }}
                                            >
                                              <SelectTrigger
                                                id={field.name}
                                                className="w-full flex-1"
                                                aria-invalid={isInvalid}
                                                onBlur={field.handleBlur}
                                              >
                                                <SelectValue />
                                              </SelectTrigger>

                                              <SelectContent
                                                alignItemWithTrigger={false}
                                              >
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

                                            {isInvalid && (
                                              <FieldError
                                                errors={field.state.meta.errors}
                                              />
                                            )}
                                          </Field>
                                        )
                                      }}
                                    />
                                  </>
                                )}

                                <form.Field
                                  name="timezone"
                                  children={(field) => {
                                    const isInvalid =
                                      field.state.meta.isTouched &&
                                      !field.state.meta.isValid

                                    return (
                                      <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>
                                          Timezone
                                        </FieldLabel>
                                        <Input
                                          id={field.name}
                                          name={field.name}
                                          value={field.state.value}
                                          onBlur={field.handleBlur}
                                          onChange={(e) =>
                                            field.handleChange(e.target.value)
                                          }
                                          aria-invalid={isInvalid}
                                          placeholder="CET"
                                          autoComplete="off"
                                        />
                                        {isInvalid && (
                                          <FieldError
                                            errors={field.state.meta.errors}
                                          />
                                        )}
                                      </Field>
                                    )
                                  }}
                                />
                              </FieldGroup>
                            )
                          }}
                        />
                      </FieldGroup>
                    </form>

                    <DialogFooter className="flex items-center justify-between! bg-transparent">
                      <Button
                        disabled={
                          !slackSettings?.settings.channelId ||
                          sendingTestMessage
                        }
                        onClick={() => {
                          sendTestSlackMessage()
                        }}
                        variant={'outline'}
                      >
                        <LoadingSwap isLoading={sendingTestMessage}>
                          Send Test Message
                        </LoadingSwap>
                      </Button>
                      <div className="flex items-center gap-2">
                        <DialogClose>
                          <Button variant={'outline'}>Cancel</Button>
                        </DialogClose>
                        <Button
                          disabled={slackSettingsPending}
                          form="slack-settings"
                          type="submit"
                        >
                          <LoadingSwap isLoading={slackSettingsPending}>
                            Save
                          </LoadingSwap>
                        </Button>
                      </div>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
              <Separator orientation="vertical" />
            </>
          )}
          <Button variant={'outline'}>
            <BookOpenIcon /> Docs <ArrowUpRightIcon />
          </Button>
        </div>
      </div>

      {integrationError ? (
        <ErrorScreen
          workspace_id={workspaceId}
          project_id={projectId}
          refetch={integrationRefetch}
          refetching={integrationRefetching}
        />
      ) : (
        <div className="6 mx-auto space-y-4 p-6">
          {integrationLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="size-10" />
              <div className="space-y-1">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <img className="size-10" src={integration?.iconUrl as string} />
              <div>
                <p className="text-3xl font-semibold">{integration?.name}</p>
                <p className="text-muted-foreground text-sm leading-3">
                  {integration?.description}
                </p>
              </div>
            </div>
          )}

          {integrationLoading ? (
            <div className="relative grid grid-cols-[minmax(0,1fr)_250px] gap-6">
              <div className="space-y-4">
                <Skeleton className="aspect-video h-full w-full" />

                <div className="flex h-40 items-center gap-4 overflow-auto">
                  <Skeleton className="aspect-video h-full w-full" />
                  <Skeleton className="aspect-video h-full w-full" />
                  <Skeleton className="aspect-video h-full w-full" />
                  <Skeleton className="aspect-video h-full w-full" />
                </div>

                <div className="mt-12 space-y-12">
                  <div className="space-y-1">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="mt-4 h-5 w-full" />
                    <Skeleton className="h-5 w-[60%]" />
                    <Skeleton className="h-5 w-[40%]" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="mt-4 h-5 w-full" />
                    <Skeleton className="h-5 w-[60%]" />
                    <Skeleton className="h-5 w-[40%]" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-30" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-30" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-4 w-30" />
                </div>
              </div>
            </div>
          ) : (
            <div className="relative grid grid-cols-[minmax(0,1fr)_250px] gap-6">
              <div className="min-w-0 space-y-4">
                <div className="aspect-video w-full border-2 border-dashed">
                  <img
                    src={activeAsset!}
                    className="h-full w-full object-cover object-center"
                    alt={integration?.name}
                  />
                </div>
                <div className="flex h-40 items-center gap-4 overflow-auto">
                  {integration?.assets.map((item, index) => (
                    <div
                      onClick={() => {
                        setSelectedAsset(item)
                      }}
                      key={index}
                      className="aspect-video h-full cursor-pointer border-2 border-dashed"
                    >
                      <img
                        src={item}
                        className="h-full w-full object-cover object-center"
                        alt={integration?.name}
                      />
                    </div>
                  ))}
                </div>

                <Markdown
                  components={{
                    h2: ({ children }) => (
                      <h2 className="mt-12 mb-4 text-2xl font-semibold">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="mt-8 mb-3 text-lg font-semibold">
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p className="text-muted-foreground">{children}</p>
                    ),
                    em: ({ children }) => (
                      <em className="italic">{children}</em>
                    ),
                    strong: ({ children }) => (
                      <strong className="text-foreground">{children}</strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="mb-4 ml-5 list-disc space-y-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => <ol className="">{children}</ol>,
                    li: ({ children }) => (
                      <li className="text-muted-foreground">{children}</li>
                    ),
                    a: ({ children, href }) => (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 underline underline-offset-4 hover:opacity-80"
                      >
                        {children}
                      </a>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="my-4 border-l-2 pl-4 italic">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="border-border my-6" />,
                  }}
                >
                  {integration?.content}
                </Markdown>
              </div>
              <div className="sticky top-32 h-fit space-y-6 self-start">
                <div className="space-y-1">
                  <p>Installs</p>
                  <p className="text-muted-foreground text-sm">
                    {formatNumber(integration?.installsCount)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p>Category</p>
                  <p className="text-muted-foreground hover:text-foreground cursor-pointer text-sm duration-150">
                    {integration?.category}
                  </p>
                </div>
                <div className="flex flex-col items-start">
                  <p>Resources</p>

                  <ResourceLink
                    href={integration?.support}
                    icon={<HeadphonesIcon />}
                  >
                    Support
                  </ResourceLink>
                  <ResourceLink
                    href={integration?.documentation}
                    icon={<FileTextIcon />}
                  >
                    Documentation
                  </ResourceLink>
                  <ResourceLink
                    href={integration?.terms}
                    icon={<HandshakeIcon />}
                  >
                    Terms
                  </ResourceLink>
                  <ResourceLink
                    href={integration?.privacy}
                    icon={<KeyRoundIcon />}
                  >
                    Privacy Policy
                  </ResourceLink>
                  <ResourceLink
                    href={integration?.website}
                    icon={<GlobeIcon />}
                  >
                    Website
                  </ResourceLink>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
