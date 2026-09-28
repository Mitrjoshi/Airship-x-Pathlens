import { useCreateWorkspaceInvitation } from '@/mutations/workspace'
import {
  getWorkspaceMembersOptions,
  getWorkspacePermissionProfilesOptions,
} from '@/queries/workspace'
import { useForm } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { Badge } from '@workspace/ui/components/badge'
import { Button } from '@workspace/ui/components/button'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { Skeleton } from '@workspace/ui/components/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@workspace/ui/components/table'
import { EllipsisIcon, SearchIcon, UserPlusIcon } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'

export const Route = createFileRoute('/app/$workspaceId/team')({
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

  const {
    data: membersData,
    isPending: membersPending,
    isError: membersError,
  } = useQuery(getWorkspaceMembersOptions(workspaceId))
  const { data: profilesData, isPending: profilesPending } = useQuery(
    getWorkspacePermissionProfilesOptions(workspaceId)
  )
  const profiles = profilesData?.data ?? []
  const getProfileLabel = (profileId: string | null, role: string) => {
    if (role === 'owner') return 'Owner'

    return (
      profiles.find((profile) => profile.id === profileId)?.name ??
      'Unassigned profile'
    )
  }

  const createInvitation = useCreateWorkspaceInvitation(workspaceId)

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
          <p className="text-2xl font-medium">Team</p>

          <div>
            <div className="flex items-center justify-between gap-4">
              <InputGroup>
                <InputGroupButton>
                  <SearchIcon />
                </InputGroupButton>
                <InputGroupInput placeholder="Search..." />
              </InputGroup>

              <Button render={<Link to="/app/$workspaceId/invite" />}>
                <UserPlusIcon />
                Invite Member
              </Button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-40 text-center">
                    Access profile
                  </TableHead>
                  <TableHead className="w-20 text-center">Action</TableHead>
                  <TableHead className="w-20 text-center"></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {membersPending
                  ? [...Array(5)].map((_, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Skeleton className="h-6 w-50" />
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-center">
                            <Skeleton className="h-6 w-30" />
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-center">
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-center">
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  : membersData?.data?.map((item) => (
                      <TableRow
                        key={item.id ?? item.email}
                        className="hover:bg-card/40 cursor-pointer"
                      >
                        <TableCell>
                          <div className="max-w-80 overflow-hidden">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <p className="truncate text-sm font-medium">
                                {item.name}
                              </p>

                              <Badge variant="outline">
                                {getProfileLabel(
                                  item.permissionProfileId,
                                  item.role
                                )}
                              </Badge>
                            </div>

                            <p className="text-muted-foreground truncate text-xs">
                              {item.email}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <span className="text-sm">
                            {item.permissionProfileName}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon">
                            <EllipsisIcon />
                          </Button>
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            disabled={item.role === 'owner'}
                            variant="destructive"
                          >
                            Leave
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  )
}
