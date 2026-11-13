import { useState, type ReactNode } from 'react'
import Markdown from 'react-markdown'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BookOpenIcon,
  FileTextIcon,
  GlobeIcon,
  HandshakeIcon,
  HeadphonesIcon,
  KeyRoundIcon,
} from 'lucide-react'

import { getIntegrationByIdOptions } from '@/queries/integrations'
import { formatNumber } from '@/utils/utils'
import { integrationProviderRegistry } from '@/components/integrations/registry'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { Separator } from '@workspace/ui/components/separator'
import { ErrorScreen } from '../-components/common/error-screen'
import { BlurImage } from '@/components/common/blur-image'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@workspace/ui/components/dialog'
import { Badge } from '@workspace/ui/components/badge'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/integrations/$integrationId'
)({
  component: RouteComponent,
})

function ResourceLink({
  href,
  icon,
  children,
}: {
  href: string | null | undefined
  icon: ReactNode
  children: ReactNode
}) {
  if (!href) {
    return (
      <Button variant="link" className="text-muted-foreground px-0" disabled>
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
      className="text-muted-foreground hover:text-foreground px-0"
    />
  )
}

function RouteComponent() {
  const { workspaceId, projectId, integrationId } = Route.useParams()

  const navigate = useNavigate()

  const {
    data: integrationData,
    isLoading: integrationLoading,
    error: integrationError,
    refetch: integrationRefetch,
    isRefetching: integrationRefetching,
  } = useQuery(getIntegrationByIdOptions(integrationId, projectId))
  const integration = integrationData?.data

  const provider = integration && integrationProviderRegistry[integration.slug]
  const Actions = provider?.Actions

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
              params: { workspaceId, projectId },
            })
          }
        >
          <ArrowLeftIcon />
        </Button>
        <div className="flex items-center gap-2">
          {!integrationLoading && integration && Actions && (
            <>
              <Actions
                workspaceId={workspaceId}
                projectId={projectId}
                returnPath={window.location.pathname}
                integration={integration}
              />
              <Separator orientation="vertical" />
            </>
          )}
          <Button
            render={<Link target="_blank" to="/docs" />}
            variant="outline"
          >
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
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <img className="size-10" src={integration?.iconUrl as string} />
              <div>
                <p className="text-xl font-medium">{integration?.name} </p>
                <p className="text-muted-foreground text-sm">
                  {integration?.description}
                </p>
              </div>
            </div>
          )}

          {integrationLoading ? (
            <LoadingContent />
          ) : (
            integration && (
              <div className="relative grid grid-cols-[minmax(0,1fr)_250px] gap-6">
                <div className="min-w-0 space-y-4">
                  {integration.assets.length > 0 && (
                    <>
                      {/* <BlurImage
                        src={activeAsset!}
                        alt={integration.name}
                        wrapperClassName="aspect-video w-full border-2 border-dashed"
                      /> */}
                      <div className="mt-6 flex items-center gap-4 overflow-auto">
                        {integration.assets.map((item, index) => (
                          <Dialog key={index}>
                            <DialogTrigger>
                              <BlurImage
                                src={item}
                                alt={integration.name}
                                wrapperClassName="h-40 aspect-video cursor-pointer border-2 border-dashed"
                                className="h-full w-full object-cover object-center"
                              />
                            </DialogTrigger>

                            <DialogContent
                              showCloseButton={false}
                              className={
                                'flex max-h-[90dvh] w-full max-w-[70dvw]! items-center justify-center rounded-none p-0'
                              }
                            >
                              <BlurImage
                                src={item}
                                alt={integration.name}
                                wrapperClassName=" h-full aspect-video cursor-pointer "
                                className="bg-background h-full w-full object-contain"
                              />
                            </DialogContent>
                          </Dialog>
                        ))}
                      </div>
                    </>
                  )}
                  <Markdown
                    components={{
                      h2: ({ children }) => (
                        <h2 className="mt-6 mb-4 text-2xl font-semibold">
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
                    {integration.content}
                  </Markdown>
                </div>
                <div className="sticky top-32 h-fit space-y-6 self-start">
                  <div className="space-y-1">
                    <p>Installs</p>
                    <p className="text-muted-foreground text-sm">
                      {formatNumber(integration.installsCount)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p>Category</p>
                    <p className="text-muted-foreground hover:text-foreground cursor-pointer text-sm duration-150">
                      {integration.category}
                    </p>
                  </div>
                  <div className="flex flex-col items-start">
                    <p>Resources</p>
                    <ResourceLink
                      href={integration.support}
                      icon={<HeadphonesIcon />}
                    >
                      Support
                    </ResourceLink>
                    <ResourceLink
                      href={integration.documentation}
                      icon={<FileTextIcon />}
                    >
                      Documentation
                    </ResourceLink>
                    <ResourceLink
                      href={integration.terms}
                      icon={<HandshakeIcon />}
                    >
                      Terms
                    </ResourceLink>
                    <ResourceLink
                      href={integration.privacy}
                      icon={<KeyRoundIcon />}
                    >
                      Privacy Policy
                    </ResourceLink>
                    <ResourceLink
                      href={integration.website}
                      icon={<GlobeIcon />}
                    >
                      Website
                    </ResourceLink>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

function LoadingContent() {
  return (
    <div className="relative mt-10 grid grid-cols-[minmax(0,1fr)_250px] gap-6">
      <div className="space-y-4">
        <div className="flex items-center gap-4 overflow-auto">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton
              key={index}
              className="data-[active=true]:border-primary aspect-video h-40 cursor-pointer rounded-none border-2 border-dashed"
            />
          ))}
        </div>
        <div className="mt-10 space-y-4">
          <Skeleton className="h-8 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[30%]" />
          </div>
        </div>
        <div className="mt-10 space-y-4">
          <Skeleton className="h-8 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[30%]" />
          </div>
        </div>
        <div className="mt-10 space-y-4">
          <Skeleton className="h-8 w-40" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[30%]" />
          </div>
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  )
}
