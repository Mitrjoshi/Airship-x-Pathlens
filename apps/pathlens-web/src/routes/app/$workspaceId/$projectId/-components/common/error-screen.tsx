import { motion } from 'motion/react'
import { getProjectsOptions } from '@/queries/projects'
import { getWorkspacesOptions } from '@/queries/workspace'
import { useCreateSupportRequest } from '@/mutations/support'
import {
  SUPPORT_MAX_FILES as MAX_FILES,
  SUPPORT_MAX_FILE_SIZE as MAX_FILE_SIZE,
  SUPPORT_MAX_TOTAL_SIZE as MAX_TOTAL_SIZE,
  createSupportRequestSchema,
  supportContentType,
  supportFieldsSchema,
  supportFileTypes,
  supportIssues,
  supportServices,
} from '@workspace/contracts'
import { useForm, useSelector } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@workspace/ui/components/sheet'
import { Textarea } from '@workspace/ui/components/textarea'
import {
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  FilmIcon,
  ImageIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'
import React, { useEffect, useId, useRef, useState } from 'react'
import { z } from 'zod'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from '@workspace/ui/components/combobox'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Skeleton } from '@workspace/ui/components/skeleton'

export const ErrorScreen = ({
  refetch,
  workspace_id,
  project_id,
  refetching,
}: {
  refetch: () => void
  workspace_id?: string
  project_id?: string
  refetching: boolean
}) => {
  return (
    <div className="my-40 flex items-center justify-center">
      <div className="flex flex-col items-center justify-center space-y-1">
        <div className="flex flex-col items-center justify-center text-center">
          <p className="text-xl font-medium">Something went wrong!</p>
          <p className="text-muted-foreground max-w-sm text-sm">
            We couldn't complete your request, please try again or contact us.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            variant="destructive"
            onClick={() => refetch()}
            disabled={refetching}
          >
            <LoadingSwap isLoading={refetching}>Try again</LoadingSwap>
          </Button>

          <>
            <Sheet>
              <SheetTrigger
                render={
                  <Button type="button" variant="outline">
                    Contact Us
                  </Button>
                }
              />

              <>
                <ContactUsSheet
                  workspace_id={workspace_id}
                  project_id={project_id}
                />
              </>
            </Sheet>
          </>
        </div>
      </div>
    </div>
  )
}

interface I_Props {
  workspace_id?: string
  project_id?: string
}

const ACCEPTED_FILES = Object.values(supportFileTypes).flat().join(',')

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const isSupportedFile = (file: File) => {
  return supportContentType(file.name, file.type) !== null
}

const filesSchema = z
  .array(z.instanceof(File))
  .max(MAX_FILES, `You can attach up to ${MAX_FILES} files.`)
  .refine(
    (files) => files.every(isSupportedFile),
    'One or more files have an unsupported format.'
  )
  .refine(
    (files) =>
      files.every((file) => file.size > 0 && file.size <= MAX_FILE_SIZE),
    'Each file must be nonempty and 10 MB or smaller.'
  )
  .refine(
    (files) =>
      files.reduce((sum, file) => sum + file.size, 0) <= MAX_TOTAL_SIZE,
    'Total attachment size cannot exceed 25 MB.'
  )

const services = [...supportServices]

const issueList = [
  {
    label: 'Dashboard',
    value: 'dashboard',
    description: 'Overview, widgets, and project summaries.',
  },
  {
    label: 'Analytics',
    value: 'analytics',
    description: 'Website metrics, trends, and analytics data.',
  },
  {
    label: 'Visitors',
    value: 'visitors',
    description: 'Visitor profiles, activity, and session details.',
  },
  {
    label: 'Events',
    value: 'events',
    description: 'Event tracking, properties, and event logs.',
  },
  {
    label: 'User Journeys',
    value: 'user_journeys',
    description: 'Visitor navigation paths and interaction flows.',
  },
  {
    label: 'Session Replay',
    value: 'session_replay',
    description: 'Recording playback and session visualization issues.',
  },
  {
    label: 'Heatmaps',
    value: 'heatmaps',
    description: 'Click, scroll, and interaction heatmap issues.',
  },
  {
    label: 'Funnels',
    value: 'funnels',
    description: 'Funnel creation, conversion tracking, and drop-offs.',
  },
  {
    label: 'Goals',
    value: 'goals',
    description: 'Goal configuration and conversion tracking.',
  },
  {
    label: 'Performance',
    value: 'performance',
    description: 'Website speed, loading times, and performance metrics.',
  },
  {
    label: 'Traffic Sources',
    value: 'traffic_sources',
    description: 'Referrers, campaigns, and traffic attribution.',
  },
  {
    label: 'Reports',
    value: 'reports',
    description: 'Report generation, exports, and scheduled reports.',
  },
  {
    label: 'AI Insights',
    value: 'ai_insights',
    description: 'AI-generated insights, summaries, and recommendations.',
  },
  {
    label: 'SEO',
    value: 'seo',
    description: 'Search visibility, indexing, and SEO metrics.',
  },
  {
    label: 'Projects',
    value: 'projects',
    description: 'Project creation, configuration, and management.',
  },
  {
    label: 'Workspace & Team Management',
    value: 'workspace_team_management',
    description: 'Workspace settings, members, roles, and permissions.',
  },
  {
    label: 'Integrations',
    value: 'integrations',
    description: 'Third-party integrations and connected services.',
  },
  {
    label: 'API & Tracking Setup',
    value: 'api_tracking_setup',
    description: 'API access, tracking scripts, and implementation.',
  },
  {
    label: 'Privacy & Data Protection',
    value: 'privacy_data_protection',
    description: 'Data privacy, masking, consent, and retention settings.',
  },
  {
    label: 'Billing & Subscription',
    value: 'billing_subscription',
    description: 'Plans, payments, invoices, and subscription management.',
  },
  {
    label: 'Notifications',
    value: 'notifications',
    description: 'Email alerts, in-app notifications, and preferences.',
  },
  {
    label: 'Feedback',
    value: 'feedback',
    description: 'Share suggestions, report issues, or request improvements.',
  },
  {
    label: 'Other',
    value: 'other',
    description: 'Something else not covered by the above categories.',
  },
]

export const ContactUsSheet = ({ workspace_id, project_id }: I_Props) => {
  const formSchema = supportFieldsSchema.extend({
    project_id: z.union([z.uuid(), z.literal('no')]),
    issue_id: z
      .string()
      .refine(
        (value) => supportIssues.some((issue) => issue === value),
        'Select an issue.'
      ),
    service: z
      .array(z.string())
      .max(services.length)
      .refine(
        (values) =>
          values.every((value) =>
            services.includes(value as (typeof services)[number])
          ),
        'Select supported services.'
      ),
    files: filesSchema,
  })

  type FormValues = z.infer<typeof formSchema>

  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })

  const [copy, setCopy] = useState<'email' | 'project' | null>(null)
  const formId = useId()
  const anchor = useComboboxAnchor()

  const { data: workspaceData, isLoading: workspaceLoading } = useQuery({
    ...getWorkspacesOptions(),
  })
  const workspaces = workspaceData?.data
  const {
    mutate: supportMutation,
    isPending: supportPending,
    data: supportData,
    reset: submitReset,
  } = useCreateSupportRequest()

  const defaultValues: FormValues = {
    workspace_id: workspace_id || workspaces?.[0]?.id || '',
    project_id: project_id || 'no',
    issue_id: '',
    severity: 'low',
    subject: '',
    service: [],
    message: '',
    files: [],
  }

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      const payload = createSupportRequestSchema.parse({
        ...value,
        project_id: value.project_id === 'no' ? null : value.project_id,
      })
      supportMutation(
        { ...payload, files: value.files },
        {
          onSuccess: () => {
            setAttachmentError(null)
            form.reset()
          },
        }
      )
    },
  })

  const isSubmitting = supportPending
  useEffect(() => {
    if (!form.getFieldValue('workspace_id') && workspaces?.[0]?.id) {
      form.setFieldValue('workspace_id', workspaces[0].id)
    }
  }, [form, workspaces])

  const workspaceId = useSelector(
    form.store,
    (state) => state.values.workspace_id
  )

  const { data: projectData, isLoading: projectLoading } = useQuery({
    ...getProjectsOptions({
      workspace_id: workspaceId!,
    }),
    enabled: !!workspaceId,
  })

  const projects = projectData?.data

  const severity = [
    { label: 'Low', value: 'low' },
    { label: 'Normal', value: 'normal' },
    { label: 'High', value: 'high' },
    { label: 'Urgent', value: 'urgent' },
  ] as const satisfies ReadonlyArray<{
    label: string
    value: FormValues['severity']
  }>

  const workspaceItems = workspaces?.map((item) => ({
    label: item.name,
    value: String(item.id),
    external: item.external,
    default: item.isDefault,
  }))

  const projectItems = [
    ...(projects?.map((item) => ({
      label: item.name,
      value: String(item.id),
      separator: false,
    })) ?? []),
    {
      label: 'No specific project',
      value: 'no',
      separator: true,
    },
  ]

  const selectedProject = useSelector(
    form.store,
    (state) => state.values.project_id
  )

  const handleCopy = (key: 'email' | 'project', text: string) => {
    navigator.clipboard.writeText(text)
    setCopy(key)
    setTimeout(() => setCopy(null), 2000)
  }

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)

  const handleFilesChange = (incomingFiles: FileList | File[]) => {
    const currentFiles = form.getFieldValue('files')
    const newFiles = Array.from(incomingFiles)
    const accepted: File[] = []
    const errors: string[] = []

    const fileKey = (file: File) =>
      `${file.name.toLowerCase()}-${file.size}-${file.lastModified}`

    const seen = new Set(currentFiles.map(fileKey))
    let totalSize = currentFiles.reduce((sum, file) => sum + file.size, 0)

    for (const file of newFiles) {
      if (seen.has(fileKey(file))) {
        errors.push(`${file.name} is already attached.`)
        continue
      }

      if (!isSupportedFile(file)) {
        errors.push(`${file.name} has an unsupported file type.`)
        continue
      }

      if (file.size === 0 || file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} must be nonempty and at most 10 MB.`)
        continue
      }

      if (currentFiles.length + accepted.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} attachments allowed.`)
        break
      }

      if (totalSize + file.size > MAX_TOTAL_SIZE) {
        errors.push(`${file.name} exceeds the 25 MB total limit.`)
        continue
      }

      accepted.push(file)
      seen.add(fileKey(file))
      totalSize += file.size
    }

    if (accepted.length) {
      form.setFieldValue('files', [...currentFiles, ...accepted])
    }

    setAttachmentError(errors.length ? errors.join(' ') : null)

    // Allows selecting the same file again after removing it.
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    const currentFiles = form.getFieldValue('files')

    form.setFieldValue(
      'files',
      currentFiles.filter((_, i) => i !== index)
    )

    setAttachmentError(null)
  }

  return (
    <SheetContent className={'w-md! max-w-full!'}>
      <SheetHeader className="border-b">
        <SheetTitle>Contact Us</SheetTitle>
        <SheetDescription>
          Tell us what&apos;s happening. We&apos;ll help you get things back on
          track.
        </SheetDescription>
      </SheetHeader>

      {supportData?.createdAt ? (
        <motion.div
          initial="hidden"
          animate="visible"
          className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center"
        >
          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.8 },
              visible: {
                opacity: 1,
                scale: 1,
                transition: {
                  type: 'spring',
                  stiffness: 220,
                  damping: 18,
                },
              },
            }}
            className="flex size-14 items-center justify-center rounded-full bg-emerald-500/10"
          >
            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.5 },
                visible: {
                  opacity: 1,
                  scale: 1,
                  transition: { delay: 0.15, duration: 0.3 },
                },
              }}
            >
              <CheckIcon className="size-6 text-emerald-600 dark:text-emerald-400" />
            </motion.div>
          </motion.div>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: {
                opacity: 1,
                y: 0,
                transition: {
                  delay: 0.2,
                  duration: 0.4,
                  ease: 'easeOut',
                },
              },
            }}
            className="space-y-2"
          >
            <h3 className="text-xl font-semibold">Request Submitted</h3>

            <p className="text-muted-foreground max-w-xs text-sm leading-relaxed">
              Your support request has been submitted successfully. Our team
              will review it and get back to you at{' '}
              <span className="text-foreground font-medium">{user.email}</span>.
            </p>
          </motion.div>

          <Button onClick={submitReset}>Done</Button>
        </motion.div>
      ) : (
        <>
          <div className={'h-full overflow-auto p-4 py-0'}>
            <form
              id={formId}
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
            >
              <fieldset disabled={isSubmitting} className="min-w-0">
                <FieldGroup>
                  <form.Field name="workspace_id">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Which workspace is affected?
                          </FieldLabel>
                          <Select
                            disabled={workspaceLoading}
                            value={field.state.value}
                            onValueChange={(v) => {
                              field.handleChange(v ?? '')
                              form.setFieldValue('project_id', 'no')
                            }}
                            onOpenChange={(open) => {
                              if (!open) field.handleBlur()
                            }}
                            items={workspaceItems}
                          >
                            <SelectTrigger
                              id={field.name}
                              aria-invalid={isInvalid}
                            >
                              <SelectValue>
                                {workspaceLoading ? (
                                  <Skeleton className="bg-input h-4 w-40" />
                                ) : null}
                              </SelectValue>
                            </SelectTrigger>

                            <SelectContent alignItemWithTrigger={false}>
                              <SelectGroup>
                                <InputGroup>
                                  <InputGroupAddon>
                                    <SearchIcon />
                                  </InputGroupAddon>
                                  <InputGroupInput
                                    autoFocus={false}
                                    placeholder="Search workspace..."
                                  />
                                </InputGroup>
                              </SelectGroup>
                              <SelectSeparator />
                              {workspaceItems?.map((item) => (
                                <SelectItem value={item.value} key={item.value}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      )
                    }}
                  </form.Field>

                  <form.Field name="project_id">
                    {(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>
                            Which project is affected?
                          </FieldLabel>
                          <Select
                            disabled={projectLoading}
                            value={field.state.value}
                            onValueChange={(v) => field.handleChange(v ?? '')}
                            onOpenChange={(open) => {
                              if (!open) field.handleBlur()
                            }}
                            items={projectItems}
                          >
                            <SelectTrigger
                              id={field.name}
                              aria-invalid={isInvalid}
                            >
                              <SelectValue>
                                {projectLoading ? (
                                  <Skeleton className="bg-input h-4 w-40" />
                                ) : null}
                              </SelectValue>
                            </SelectTrigger>

                            <SelectContent alignItemWithTrigger={false}>
                              {!!projects?.length && (
                                <>
                                  <SelectGroup>
                                    <InputGroup>
                                      <InputGroupAddon>
                                        <SearchIcon />
                                      </InputGroupAddon>
                                      <InputGroupInput
                                        autoFocus={false}
                                        placeholder="Search project..."
                                      />
                                    </InputGroup>
                                  </SelectGroup>
                                  <SelectSeparator />
                                </>
                              )}
                              <SelectGroup className={'p-0'}>
                                {!projects?.length && (
                                  <div className="flex items-center justify-center py-6">
                                    <p className="text-muted-foreground text-sm font-medium">
                                      No projects found.
                                    </p>
                                  </div>
                                )}
                                {projectItems.map((item) => (
                                  <React.Fragment key={item.value}>
                                    {item.separator && <SelectSeparator />}
                                    <SelectItem
                                      value={item.value}
                                      key={item.value}
                                    >
                                      {item.label}
                                    </SelectItem>
                                  </React.Fragment>
                                ))}
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}

                          <div className="flex items-center gap-2">
                            {selectedProject === 'no' ? (
                              <>
                                <p className="text-muted-foreground font-semibold">
                                  No Project has been selected
                                </p>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 overflow-hidden">
                                <p className="text-muted-foreground text-xs text-nowrap">
                                  Project ID:{' '}
                                </p>
                                <Button
                                  type="button"
                                  variant={'outline'}
                                  className={'gap-2 truncate'}
                                  size="xs"
                                  onClick={() => {
                                    handleCopy('project', selectedProject)
                                  }}
                                >
                                  {selectedProject}

                                  {copy === 'project' ? (
                                    <CheckIcon className="icon-switch" />
                                  ) : (
                                    <CopyIcon className="icon-switch" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </Field>
                      )
                    }}
                  </form.Field>

                  <FieldGroup className="flex flex-row items-center gap-4">
                    <form.Field
                      name="issue_id"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field className="flex-1" data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Which issue are you facing?
                            </FieldLabel>
                            <Select
                              value={field.state.value}
                              onValueChange={(v) => field.handleChange(v ?? '')}
                              onOpenChange={(open) => {
                                if (!open) field.handleBlur()
                              }}
                              items={issueList}
                            >
                              <SelectTrigger
                                id={field.name}
                                aria-invalid={isInvalid}
                              >
                                <SelectValue placeholder="Select an issue" />
                              </SelectTrigger>

                              <SelectContent
                                align="start"
                                className={'max-h-100 w-fit'}
                                alignItemWithTrigger={false}
                              >
                                {issueList?.map((item) => (
                                  <SelectItem
                                    value={item.value}
                                    key={item.value}
                                  >
                                    <div>
                                      <p className="block!">{item.label}</p>
                                      <p className="text-muted-foreground block text-xs">
                                        {item.description}
                                      </p>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    />
                    <form.Field
                      name="severity"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field className="flex-1" data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Severity
                            </FieldLabel>
                            <Select
                              value={field.state.value}
                              onValueChange={(v) =>
                                field.handleChange(v as FormValues['severity'])
                              }
                              onOpenChange={(open) => {
                                if (!open) field.handleBlur()
                              }}
                              items={severity}
                            >
                              <SelectTrigger
                                id={field.name}
                                aria-invalid={isInvalid}
                              >
                                <SelectValue />
                              </SelectTrigger>

                              <SelectContent alignItemWithTrigger={false}>
                                {severity?.map((item) => (
                                  <SelectItem
                                    value={item.value}
                                    key={item.value}
                                  >
                                    {item.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    />
                  </FieldGroup>

                  <form.Field
                    name="subject"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name}>Subject</FieldLabel>
                          <Input
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Subject"
                            autoComplete="off"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      )
                    }}
                  />

                  <form.Field
                    name="service"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid

                      return (
                        <Field className="flex-1" data-invalid={isInvalid}>
                          <FieldLabel>Which services are affected?</FieldLabel>

                          <Combobox
                            multiple
                            autoHighlight
                            items={services}
                            value={field.state.value}
                            onValueChange={(values) =>
                              field.handleChange(values)
                            }
                            highlightItemOnHover
                          >
                            <ComboboxChips ref={anchor} className="w-full">
                              <ComboboxValue>
                                {(values) => (
                                  <React.Fragment>
                                    {values.map((value: string) => (
                                      <ComboboxChip key={value}>
                                        {value}
                                      </ComboboxChip>
                                    ))}

                                    <ComboboxChipsInput
                                      placeholder={
                                        values.length === 0
                                          ? 'No service in particular.'
                                          : undefined
                                      }
                                    />
                                  </React.Fragment>
                                )}
                              </ComboboxValue>
                            </ComboboxChips>
                            <ComboboxContent anchor={anchor}>
                              <ComboboxList>
                                {(item) => (
                                  <ComboboxItem key={item} value={item}>
                                    {item}
                                  </ComboboxItem>
                                )}
                              </ComboboxList>
                            </ComboboxContent>
                          </Combobox>

                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      )
                    }}
                  />

                  <form.Field
                    name="message"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel
                            htmlFor={field.name}
                            className="flex items-center justify-between"
                          >
                            Message
                            <p className="text-muted-foreground text-xs">
                              5000 character limit
                            </p>
                          </FieldLabel>

                          <Textarea
                            maxLength={5000}
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            placeholder="Describe the issue you’re facing, along with any relevant information. Please be as detailed and specific as possible."
                            autoComplete="off"
                            className="max-h-40 min-h-25"
                          />
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      )
                    }}
                  />

                  <form.Field name="files">
                    {(field) => {
                      const files = field.state.value
                      const totalSize = files.reduce(
                        (sum, file) => sum + file.size,
                        0
                      )
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid

                      return (
                        <Field data-invalid={isInvalid}>
                          <div className="flex items-center justify-between gap-3">
                            <FieldLabel>
                              Attachments
                              <span className="text-muted-foreground">
                                (optional)
                              </span>
                            </FieldLabel>

                            <span className="text-muted-foreground text-xs tabular-nums">
                              {files.length}/{MAX_FILES} files
                            </span>
                          </div>

                          <FieldDescription>
                            Images, PDF, documents, CSV, JSON, logs, and videos.
                            Max 10 MB per file, 25 MB total.
                          </FieldDescription>

                          <input
                            ref={fileInputRef}
                            type="file"
                            className="sr-only"
                            multiple
                            accept={ACCEPTED_FILES}
                            aria-label="Add attachments"
                            onChange={(e) => {
                              if (e.target.files) {
                                handleFilesChange(e.target.files)
                              }
                            }}
                          />

                          <div className="flex flex-wrap gap-2">
                            {files.map((file, index) => {
                              const isImage = file.type.startsWith('image/')
                              const isVideo = file.type.startsWith('video/')

                              const Icon = isImage
                                ? ImageIcon
                                : isVideo
                                  ? FilmIcon
                                  : FileTextIcon

                              return (
                                <div
                                  key={`${file.name}-${file.size}-${file.lastModified}`}
                                  className="border-border bg-muted/30 relative flex h-14 max-w-full min-w-0 items-center gap-2 rounded-md border px-3 pr-9"
                                >
                                  <div className="bg-background flex size-8 shrink-0 items-center justify-center rounded-md border">
                                    <Icon className="text-muted-foreground size-4" />
                                  </div>

                                  <div className="max-w-40 min-w-0">
                                    <p
                                      className="truncate text-xs font-medium"
                                      title={file.name}
                                    >
                                      {file.name}
                                    </p>

                                    <p className="text-muted-foreground text-[11px]">
                                      {formatFileSize(file.size)}
                                    </p>
                                  </div>

                                  <Button
                                    type="button"
                                    size="icon-xs"
                                    variant="ghost"
                                    aria-label={`Remove ${file.name}`}
                                    className="absolute top-1 right-1"
                                    onClick={() => removeAttachment(index)}
                                  >
                                    <XIcon className="size-3.5" />
                                  </Button>
                                </div>
                              )
                            })}

                            {files.length < MAX_FILES && (
                              <Button
                                type="button"
                                size="icon-lg"
                                className="size-14 shrink-0 border-dashed"
                                variant="outline"
                                aria-label="Add attachment"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <PlusIcon className="size-5" />
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground text-xs">
                              {`${formatFileSize(totalSize)} of 25 MB used`}
                            </span>
                          </div>

                          {attachmentError && (
                            <p
                              role="alert"
                              className="text-destructive text-xs"
                            >
                              {attachmentError}
                            </p>
                          )}

                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                        </Field>
                      )
                    }}
                  </form.Field>
                </FieldGroup>
              </fieldset>
            </form>
          </div>

          {!workspaceLoading && !projectLoading && (
            <SheetFooter className="border-t">
              <Button type="submit" form={formId} disabled={isSubmitting}>
                <LoadingSwap isLoading={isSubmitting}>Submit</LoadingSwap>
              </Button>

              <p className="text-muted-foreground text-xs">
                We will contact you at{' '}
                <span className="text-foreground">{user.email}</span>. Please
                ensure emails from pathlens.app are allowed.
              </p>
            </SheetFooter>
          )}
        </>
      )}
    </SheetContent>
  )
}
