import { createFileRoute, Link } from '@tanstack/react-router'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@workspace/ui/components/avatar'
import { Badge } from '@workspace/ui/components/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/card'
import {
  InputGroup,
  InputGroupButton,
  InputGroupInput,
} from '@workspace/ui/components/input-group'
import { SearchIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProjectIntegrationsOptions } from '@/queries/integrations'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { ErrorScreen } from '../-components/common/error-screen'
import { toast } from 'sonner'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/integrations/'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId, workspaceId } = Route.useParams()
  const [search, setSearch] = useState('')

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

  const integrations = integrationsData?.data

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
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, index) => (
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
              <div className="grid grid-cols-3 gap-4">
                {searchedIntegrations.map((item) => (
                  <Link
                    to="/app/$workspaceId/$projectId/integrations/$integrationId"
                    params={{
                      workspaceId,
                      projectId,
                      integrationId: item.id,
                    }}
                  >
                    <Card
                      className="bg-card/30 rounded-none border-2 border-dashed duration-200"
                      key={item.id}
                    >
                      <CardContent className="p-0">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <Avatar className={'bg-transparent'} size="lg">
                              <AvatarImage src={item.iconUrl ?? undefined} />
                              <AvatarFallback>
                                {item.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            <Badge variant="outline">{item.category}</Badge>
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
                    </Card>
                  </Link>
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
    </div>
  )
}
