import { createFileRoute, useRouter } from '@tanstack/react-router'
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
  ActivityIcon,
  ArrowLeftIcon,
  CheckIcon,
  CirclePlayIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { navigationIcons } from '@/config/navigation-icons'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldTitle,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { Textarea } from '@workspace/ui/components/textarea'
import { Separator } from '@workspace/ui/components/separator'
import { Checkbox } from '@workspace/ui/components/checkbox'
import { z } from 'zod'
import { useForm } from '@tanstack/react-form'
import { useCreateProject } from '@/mutations/projects'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'

const trackingOptions = [
  {
    name: 'captureReplay' as const,
    label: 'Session Replay',
    description: 'Reconstruct the path visitors take through your site.',
    detail: 'Mask inputs and sensitive text when needed.',
    icon: CirclePlayIcon,
  },
  {
    name: 'capturePerformance' as const,
    label: 'Performance Metrics',
    description: 'Understand how quickly pages load for real visitors.',
    detail: 'Track timing across devices and browsers.',
    icon: ActivityIcon,
  },
  {
    name: 'captureErrors' as const,
    label: 'Error Tracking',
    description: 'Capture uncaught errors and rejected promises.',
    detail: 'Find technical friction alongside behavior.',
    icon: TriangleAlertIcon,
  },
] as const

export const Route = createFileRoute('/app/$workspaceId/create')({
  component: RouteComponent,
})

export const TrackingType = {
  CAPTURE_REPLAY: 'captureReplay',
  CAPTURE_PERFORMANCE: 'capturePerformance',
  CAPTURE_ERRORS: 'captureErrors',
} as const

export type TrackingType = (typeof TrackingType)[keyof typeof TrackingType]

export const TrackingTypeSchema = z.enum([
  TrackingType.CAPTURE_REPLAY,
  TrackingType.CAPTURE_PERFORMANCE,
  TrackingType.CAPTURE_ERRORS,
])

export const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),

  domain: z.url('Enter a valid URL'),

  description: z.string(),

  tracking: z
    .array(TrackingTypeSchema)
    .min(1, 'Select at least one tracking option'),
})

type ProjectFormValues = z.infer<typeof projectSchema>

function RouteComponent() {
  const router = useRouter()
  const { workspaceId } = Route.useParams()

  const { mutate, isPending } = useCreateProject()

  const defaultValues: ProjectFormValues = {
    name: '',
    domain: '',
    description: '',
    tracking: [
      TrackingType.CAPTURE_REPLAY,
      TrackingType.CAPTURE_PERFORMANCE,
      TrackingType.CAPTURE_ERRORS,
    ],
  }

  const form = useForm({
    defaultValues,

    validators: {
      onSubmit: projectSchema,
    },

    onSubmit: async ({ value }) => {
      mutate({
        captureErrors: value.tracking.includes(TrackingType.CAPTURE_ERRORS),
        capturePerformance: value.tracking.includes(
          TrackingType.CAPTURE_PERFORMANCE
        ),
        captureReplay: value.tracking.includes(TrackingType.CAPTURE_REPLAY),
        description: value.description,
        domain: value.domain,
        name: value.name,
        workspace_id: workspaceId,
      })
    },
  })

  return (
    <div>
      <div className="mx-auto max-w-4xl pt-10">
        <div className="space-y-5">
          <div className="space-y-2">
            <Button
              onClick={() => {
                router.history.back()
              }}
              variant="ghost"
            >
              <ArrowLeftIcon />
              Back
            </Button>
          </div>

          <div className="flex items-start gap-4">
            <Card className="bg-card/30 flex-1 rounded-none border-2 border-dashed p-0">
              <CardHeader className="border-b-2 border-dashed p-4">
                <CardTitle className="flex items-center gap-2">
                  <navigationIcons.projects className="size-5" />
                  Create a new Project
                </CardTitle>
                <CardDescription>
                  Give this project a clear identity so your team can find it
                  later
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  id="project-form"
                  autoComplete="off"
                  onSubmit={(e) => {
                    e.preventDefault()
                    form.handleSubmit()
                  }}
                >
                  <FieldGroup className="flex flex-col gap-5 lg:gap-4">
                    {/* Project Name + Domain */}
                    <FieldGroup className="flex flex-row items-start">
                      <form.Field
                        name="name"
                        children={(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid

                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                Project Name
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
                                placeholder="Name"
                              />

                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          )
                        }}
                      />

                      <form.Field
                        name="domain"
                        children={(field) => {
                          const isInvalid =
                            field.state.meta.isTouched &&
                            !field.state.meta.isValid

                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor={field.name}>
                                Domain
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
                                placeholder="https://example.com"
                              />

                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          )
                        }}
                      />
                    </FieldGroup>

                    {/* Description */}
                    <form.Field
                      name="description"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid

                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>
                              Project Description (optional)
                            </FieldLabel>

                            <Textarea
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              placeholder="Description"
                              className="max-h-80"
                            />

                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    />

                    <Separator />

                    {/* Tracking */}
                    <form.Field
                      name="tracking"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid

                        return (
                          <Field data-invalid={isInvalid}>
                            <div>
                              <FieldLegend>
                                Choose what you want to track
                              </FieldLegend>
                              <FieldDescription>
                                Select the events you want this project to
                                track.
                              </FieldDescription>
                            </div>

                            <FieldGroup className="gap-0! divide-y-2 divide-dashed border-2 border-dashed">
                              {trackingOptions.map((item) => {
                                const checked = field.state.value.includes(
                                  item.name
                                )

                                return (
                                  <FieldLabel
                                    key={item.name}
                                    htmlFor={`tracking-${item.name}`}
                                    className="h-full w-full cursor-pointer flex-row items-start gap-4 p-4"
                                  >
                                    <Card className="bg-card/30 w-full rounded-none border-none p-0">
                                      <CardContent className="flex items-center p-0">
                                        <div className="flex w-full items-center gap-4">
                                          <div className="bg-primary/25 flex aspect-square h-10 shrink-0 items-center justify-center">
                                            <item.icon size={20} />
                                          </div>

                                          <div className="min-w-0 flex-1">
                                            <FieldTitle>
                                              {item.label}
                                            </FieldTitle>

                                            <FieldDescription>
                                              {item.description}
                                            </FieldDescription>
                                          </div>

                                          <Checkbox
                                            className={'mr-2'}
                                            id={`tracking-${item.name}`}
                                            name={item.name}
                                            checked={checked}
                                            aria-invalid={isInvalid}
                                            onCheckedChange={(value) => {
                                              if (value === true) {
                                                field.handleChange([
                                                  ...field.state.value,
                                                  item.name,
                                                ])
                                              } else {
                                                field.handleChange(
                                                  field.state.value.filter(
                                                    (name) => name !== item.name
                                                  )
                                                )
                                              }
                                            }}
                                          />
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </FieldLabel>
                                )
                              })}
                            </FieldGroup>

                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    />
                  </FieldGroup>
                </form>
              </CardContent>
              <CardFooter className="flex justify-end rounded-none border-t-2 border-dashed bg-transparent">
                <Button form="project-form" type="submit">
                  <LoadingSwap isLoading={isPending}>
                    <div className="flex items-center gap-2">
                      <CheckIcon />
                      Create
                    </div>
                  </LoadingSwap>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
