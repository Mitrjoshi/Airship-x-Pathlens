import { getProjectsOptions } from '@/queries/projects'
import { getWorkspacesOptions } from '@/queries/workspace'
import { useForm, useSelector } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { useRouteContext } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@workspace/ui/components/sheet'
import { Textarea } from '@workspace/ui/components/textarea'
import { CheckIcon, CopyIcon, LoaderIcon } from 'lucide-react'
import React, { useState } from 'react'
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

          {project_id && (
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
          )}
        </div>
      </div>
    </div>
  )
}

interface I_Props {
  workspace_id?: string
  project_id?: string
}

export const ContactUsSheet = ({ workspace_id, project_id }: I_Props) => {
  const user = useRouteContext({
    from: '/app',
    select: (context) => context.user,
  })

  const [copy, setCopy] = useState<'email' | 'project' | null>(null)
  const anchor = useComboboxAnchor()

  const { data: workspaceData, isLoading: workspaceLoading } = useQuery({
    ...getWorkspacesOptions(),
  })
  const workspaces = workspaceData?.data

  const { data: projectData, isLoading: projectLoading } = useQuery({
    ...getProjectsOptions({
      workspace_id: workspace_id!,
    }),
    enabled: !!workspace_id,
  })

  const projects = projectData?.data

  const formSchema = z.object({
    workspace_id: z.string(),
    project_id: z.string(),
    issue_id: z.string(),
    severity: z.enum(['low', 'normal', 'high', 'urgent']),
    subject: z.string(),
    service: z.array(z.string()),
    message: z.string(),
    files: z.file().nullable(),
  })

  type FormValues = z.infer<typeof formSchema>

  const defaultValues: FormValues = {
    workspace_id: workspace_id || '',
    project_id: project_id || '',
    issue_id: '',
    severity: 'low',
    subject: '',
    service: [''],
    message: '',
    files: null,
  }

  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: () => {},
  })

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

  const projectItems =
    projects?.map((item) => ({
      label: item.name,
      value: String(item.id),
    })) ?? []

  const selectedProject = useSelector(
    form.store,
    (state) => state.values.project_id
  )

  const handleCopy = (key: 'email' | 'project', text: string) => {
    navigator.clipboard.writeText(text)
    setCopy(key)
    setTimeout(() => setCopy(null), 2000)
  }

  const services = [
    'Dashboard',
    'Analytics',
    'Projects',
    'Workspace & Team Management',
    'Integrations',
    'Tracking Setup',
    'Privacy & Data Protection',
    'Billing & Subscription',
    'Other',
  ]

  return (
    <SheetContent className={'w-md! max-w-7xl!'}>
      <SheetHeader className="border-b">
        <SheetTitle>Contact Us</SheetTitle>
      </SheetHeader>

      <div className={'h-full p-4'}>
        {workspaceLoading || projectLoading ? (
          <div className="flex h-full w-full items-center justify-center">
            <LoaderIcon className="text-muted-foreground size-5 animate-spin" />
          </div>
        ) : (
          <form
            id="contact-us"
            onSubmit={(e) => {
              e.preventDefault()
              form.handleSubmit()
            }}
          >
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
                        value={field.state.value}
                        onValueChange={(v) => field.handleChange(v ?? '')}
                        onOpenChange={(open) => {
                          if (!open) field.handleBlur()
                        }}
                        items={workspaceItems}
                      >
                        <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent alignItemWithTrigger={false}>
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
                        value={field.state.value}
                        onValueChange={(v) => field.handleChange(v ?? '')}
                        onOpenChange={(open) => {
                          if (!open) field.handleBlur()
                        }}
                        items={projectItems}
                      >
                        <SelectTrigger id={field.name} aria-invalid={isInvalid}>
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent alignItemWithTrigger={false}>
                          {projectItems?.map((item) => (
                            <SelectItem value={item.value} key={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isInvalid && (
                        <FieldError errors={field.state.meta.errors} />
                      )}

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <p className="text-muted-foreground text-xs text-nowrap">
                            Project ID:{' '}
                          </p>
                          <Button
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
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field className="flex-1" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Which issue are you facing?
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
                            <SelectValue placeholder="Select an issue" />
                          </SelectTrigger>

                          <SelectContent alignItemWithTrigger={false}>
                            {severity?.map((item) => (
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
                />
                <form.Field
                  name="severity"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid
                    return (
                      <Field className="flex-1" data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>Severity</FieldLabel>
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
                        defaultValue={[]}
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
            </FieldGroup>
          </form>
        )}

        <div className="mt-4 space-y-1 overflow-hidden">
          <p className="text-sm">Having trouble submitting the form?</p>
          <p className="text-muted-foreground text-xs">
            Email us at{' '}
            <Button
              onClick={() => handleCopy('email', 'support@pathlens.app')}
              size="xs"
              variant={'link'}
              className={'text-muted-foreground px-0'}
            >
              support@pathlens.app
              {copy === 'email' ? (
                <CheckIcon className="icon-switch" />
              ) : (
                <CopyIcon className="icon-switch" />
              )}
            </Button>{' '}
            with details and your Project ID:{' '}
            <Button
              onClick={() => handleCopy('project', selectedProject)}
              size="xs"
              variant={'link'}
              className={'text-muted-foreground px-0'}
            >
              {selectedProject}{' '}
              {copy === 'project' ? (
                <CheckIcon className="icon-switch" />
              ) : (
                <CopyIcon className="icon-switch" />
              )}
            </Button>
          </p>
        </div>
      </div>

      {!workspaceLoading && !projectLoading && (
        <SheetFooter className="border-t">
          <Button>Submit</Button>

          <p className="text-muted-foreground text-xs">
            We will contact you at{' '}
            <span className="text-foreground">{user.email}</span>. Please ensure
            emails from pathlens.app are allowed.
          </p>
        </SheetFooter>
      )}
    </SheetContent>
  )
}
