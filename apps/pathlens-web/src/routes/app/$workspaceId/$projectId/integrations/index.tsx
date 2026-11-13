import { createFileRoute, Link } from '@tanstack/react-router'
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
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getIntegrationCategoriesOptions,
  getIntegrationsOptions,
} from '@/queries/integrations'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { ErrorScreen } from '../-components/common/error-screen'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@workspace/ui/components/select'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/integrations/'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId, workspaceId } = Route.useParams()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [filter, setFilter] = useState<'all' | 'installed' | undefined>('all')

  const {
    data: integrationsData,
    isLoading: integrationLoading,
    isError: integrationError,
    refetch: integrationsRefetch,
    isRefetching: integrationsRefetching,
  } = useQuery(
    getIntegrationsOptions({
      category: category === 'all' ? undefined : category,
      filter: filter,
      projectId,
    })
  )

  const {
    data: integrationsCategoriesData,
    isLoading: integrationsCategoriesLoading,
    isError: integrationsCategoriesError,
    refetch: integrationsCategoriesRefetch,
    isRefetching: integrationsCategoriesRefetching,
  } = useQuery(getIntegrationCategoriesOptions())

  const integrations = integrationsData?.data
  const integrationsCategories = integrationsCategoriesData?.data

  const searchedIntegrations = (integrations ?? []).filter((integration) =>
    integration.name.toLowerCase().includes(search.toLowerCase())
  )

  const globalLoading = integrationLoading || integrationsCategoriesLoading
  const globalError = integrationError || integrationsCategoriesError
  const globalRefetching =
    integrationsRefetching || integrationsCategoriesRefetching
  const refetch = () =>
    Promise.all([integrationsRefetch(), integrationsCategoriesRefetch()])

  const categories = [
    {
      value: 'all',
      label: 'All Categories',
    },
    ...(integrationsCategories?.map((item) => ({
      value: item,
      label: item,
    })) ?? []),
  ]

  return (
    <div>
      <div className="mx-auto space-y-4 p-6">
        <div>
          <p className="text-xl font-medium">Integrations</p>
          <p className="text-muted-foreground text-sm">
            Connect your favorite tools to extend Pathlens.
          </p>
        </div>

        {globalError && !globalLoading ? (
          <>
            <ErrorScreen
              refetch={refetch}
              refetching={globalRefetching}
              project_id={projectId}
              workspace_id={workspaceId}
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
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

              <div className="flex items-center gap-2">
                <Select
                  disabled={globalLoading}
                  value={category}
                  items={categories}
                  onValueChange={(e) => {
                    setCategory(e as string)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent
                    alignItemWithTrigger={false}
                    className={'w-fit'}
                  >
                    {categories?.map((item, index) => (
                      <SelectItem key={index} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  onValueChange={(e) => {
                    setFilter(e as 'all' | 'installed')
                  }}
                  value={filter}
                  items={[
                    {
                      value: 'all',
                      label: 'All Integrations',
                    },
                    {
                      value: 'installed',
                      label: 'Installed Integrations',
                    },
                  ]}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent
                    alignItemWithTrigger={false}
                    className={'w-fit'}
                  >
                    {[
                      {
                        value: 'all',
                        label: 'All Integrations',
                      },
                      {
                        value: 'installed',
                        label: 'Installed Integrations',
                      },
                    ].map((item, index) => (
                      <SelectItem key={index} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {globalLoading ? (
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, index) => (
                  <Card
                    className="bg-card/30 h-full rounded-none border-2 border-dashed"
                    key={index}
                  >
                    <CardHeader className="space-y-4">
                      <Skeleton className="size-12" />
                      <div className="space-y-1">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-5 w-1/3" />
                      </div>
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
                      className="bg-card/30 hover:bg-input/40 h-full rounded-none border-2 border-dashed duration-200"
                      key={item.id}
                    >
                      <CardContent className="space-y-4 p-0">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <img
                              className="size-10"
                              src={item.iconUrl ?? undefined}
                              alt=""
                            />

                            <div className="mt-2 flex items-center gap-2">
                              <Badge variant="outline">{item.category}</Badge>
                              {item.isConnected && <Badge>Connected</Badge>}
                            </div>
                          </div>
                          <CardTitle>
                            {item.name}

                            {item.status === 'coming_soon' && (
                              <Badge className="ml-2" variant="secondary">
                                Coming Soon
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>{item.description}</CardDescription>
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
