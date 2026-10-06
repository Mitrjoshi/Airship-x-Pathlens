import { useCreateWorkspaceInvitation } from '@/mutations/workspace'
import { getWorkspacePermissionProfilesOptions } from '@/queries/workspace'
import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
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
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from '@workspace/ui/components/field'
import { Input } from '@workspace/ui/components/input'
import { LoadingSwap } from '@workspace/ui/components/loading-swap'
import {
  RadioGroup,
  RadioGroupItem,
} from '@workspace/ui/components/radio-group'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { ArrowLeftIcon, MailPlusIcon, PlusIcon } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

export const Route = createFileRoute('/app/$workspaceId/invite')({
  component: RouteComponent,
})

const formSchema = z.object({
  email: z.email(),
  permission_profile_id: z.string(),
})

function RouteComponent() {
  const { workspaceId } = Route.useParams()
  const router = useRouter()
  const [permissionProfileId, setPermissionProfileId] = useState('')

  const { data: profilesData, isPending: profilesPending } = useQuery(
    getWorkspacePermissionProfilesOptions(workspaceId)
  )
  const createInvitation = useCreateWorkspaceInvitation(workspaceId)

  const profiles = profilesData?.data ?? []
  const defaultProfile =
    profiles.find((profile) => profile.name === 'Viewer') ?? profiles[0]
  const selectedPermissionProfileId =
    permissionProfileId || defaultProfile?.id || ''

  const form = useForm({
    defaultValues: {
      email: '',
      permission_profile_id: '',
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value: { email, permission_profile_id } }) => {
      createInvitation.mutate({
        email,
        permissionProfileId: permission_profile_id,
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
            <p className="text-2xl font-medium">Add team members</p>
          </div>

          <div className="gap-4">
            <Card className="bg-card/30 flex-1 rounded-none border-2 border-dashed p-0">
              <CardHeader className="border-b-2 border-dashed p-4">
                <CardTitle className="flex items-center gap-2">
                  <MailPlusIcon className="size-5" />
                  Send an invitation
                </CardTitle>
                <CardDescription>
                  The recipient must already have a Pathlens account.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <form
                  id="invite-form"
                  autoComplete="off"
                  onSubmit={(e) => {
                    e.preventDefault()
                    form.handleSubmit()
                  }}
                >
                  <FieldGroup className="flex flex-col gap-5 lg:gap-4">
                    <form.Field
                      name="permission_profile_id"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field>
                            <div className="flex items-start justify-between">
                              <div>
                                <FieldLegend>Role</FieldLegend>
                                <FieldDescription>
                                  Select a role for the invited user or create a
                                  new role
                                </FieldDescription>
                              </div>

                              <Button
                                render={
                                  <Link
                                    params={{
                                      workspaceId,
                                    }}
                                    search={{
                                      create: true,
                                    }}
                                    to="/app/$workspaceId/permissions"
                                  />
                                }
                              >
                                <PlusIcon />
                                New Role
                              </Button>
                            </div>

                            <RadioGroup
                              name={field.name}
                              value={field.state.value}
                              onValueChange={field.handleChange}
                              className={
                                'gap-0 rounded-none border-2 border-dashed'
                              }
                            >
                              {profilesPending
                                ? [...Array(2)].map((_, i) => (
                                    <div
                                      className="space-y-2 border-b-2 border-dashed p-3 last:border-0"
                                      key={i}
                                    >
                                      <Skeleton className="h-4 w-40" />
                                      <Skeleton className="h-4 w-70" />
                                    </div>
                                  ))
                                : profiles.map((plan) => (
                                    <FieldLabel
                                      key={plan.id}
                                      htmlFor={`form-tanstack-radiogroup-${plan.id}`}
                                      className={
                                        'border-border! rounded-none! border-0! border-b-2! border-dashed! last:border-0!'
                                      }
                                    >
                                      <Field
                                        orientation="horizontal"
                                        data-invalid={isInvalid}
                                      >
                                        <RadioGroupItem
                                          value={plan.id}
                                          id={`form-tanstack-radiogroup-${plan.id}`}
                                          aria-invalid={isInvalid}
                                        />
                                        <FieldContent>
                                          <FieldTitle>{plan.name}</FieldTitle>
                                          <FieldDescription>
                                            {plan.description}
                                          </FieldDescription>
                                        </FieldContent>
                                      </Field>
                                    </FieldLabel>
                                  ))}
                            </RadioGroup>
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    />

                    <form.Field
                      name="email"
                      children={(field) => {
                        const isInvalid =
                          field.state.meta.isTouched &&
                          !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                            <Input
                              id={field.name}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) =>
                                field.handleChange(e.target.value)
                              }
                              aria-invalid={isInvalid}
                              placeholder="name1@example.com, name2@example.com"
                              maxLength={50}
                              type="email"
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
              </CardContent>
              <CardFooter className="border-t-2 border-dashed bg-transparent">
                <Button type="submit" form="invite-form" variant="secondary">
                  <LoadingSwap isLoading={createInvitation.isPending}>
                    Send Invitation
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
