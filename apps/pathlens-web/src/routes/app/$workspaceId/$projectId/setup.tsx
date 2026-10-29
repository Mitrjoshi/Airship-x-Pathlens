import { createFileRoute } from '@tanstack/react-router'
import {
  CodeBlock,
  integrations,
} from '@/routes/(open)/-components/few-lines-of-code'
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { Skeleton } from '@workspace/ui/components/skeleton'
import { IntegrationSelector } from './api-keys'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProjectApiKeysOptions } from '@/queries/api-keys'
import { mask } from '@/utils/utils'
import { toast } from 'sonner'
import { ErrorScreen } from './-components/common/error-screen'
import { getWorkspacePermissionsOptions } from '@/queries/workspace'
import { NoPermissionView } from './-components/common/no-permission-view'

export const Route = createFileRoute('/app/$workspaceId/$projectId/setup')({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId, workspaceId } = Route.useParams()

  const [activeIntegration, setActiveIntegration] = useState('html')
  const [copied, setCopied] = useState(false)
  const [masked, setMasked] = useState(true)

  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: permissionsData, isLoading: permissionsLoading } = useQuery(
    getWorkspacePermissionsOptions(workspaceId)
  )

  const permissions = permissionsData?.data
  const hasViewPermission = permissions?.includes('project.api_keys.view')

  const {
    data: keysData,
    isLoading: keysLoading,
    isError: keysError,
    refetch,
  } = useQuery({
    ...getProjectApiKeysOptions(projectId),
    enabled: !!hasViewPermission,
  })

  const apiKey = keysData?.data?.[0]?.secret

  const integration =
    integrations.find((item) => item.id === activeIntegration) ??
    integrations[0]!

  const actualCode = apiKey
    ? integration.code.replace('plk_********', apiKey)
    : ''

  const previewCode = apiKey
    ? integration.code.replace('plk_********', masked ? mask(apiKey) : apiKey)
    : ''

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
    }
  }, [])

  const handleIntegrationChange = (value: string) => {
    setActiveIntegration(value)
    setCopied(false)
  }

  const handleCopy = async () => {
    if (!apiKey) {
      toast.error('No API key found for this project')
      return
    }

    try {
      await navigator.clipboard.writeText(actualCode)

      setCopied(true)
      toast.success('Script copied successfully')

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }

      copyTimeoutRef.current = setTimeout(() => {
        setCopied(false)
        copyTimeoutRef.current = null
      }, 1500)
    } catch {
      toast.error('Failed to copy script')
    }
  }

  return (
    <div>
      <div className="space-y-4 p-6">
        <div className="">
          <h1 className="text-xl font-medium">Setup</h1>

          <p className="text-muted-foreground text-sm">
            Add the tracking script to your website to start collecting events
            and uncover insights into your users' behavior.
          </p>
        </div>

        {!hasViewPermission && !permissionsLoading ? (
          <NoPermissionView />
        ) : (
          <>
            {keysLoading ? (
              <div className="mx-auto w-fit space-y-4 pt-2">
                <Skeleton className="mx-auto h-10 w-120 max-w-full rounded-full" />

                <div className="w-[min(42rem,calc(100vw-3rem))] overflow-hidden border-2 border-dashed">
                  <div className="bg-input/20 flex items-center justify-between border-b-2 border-dashed px-4 py-2">
                    <div className="flex items-center gap-1">
                      <Skeleton className="size-3 rounded-full" />
                      <Skeleton className="size-3 rounded-full" />
                      <Skeleton className="size-3 rounded-full" />
                      <Skeleton className="ml-2 h-4 w-32" />
                    </div>

                    <div className="flex items-center gap-1">
                      <Skeleton className="size-8 rounded-md" />
                      <Skeleton className="size-8 rounded-md" />
                    </div>
                  </div>

                  <div className="space-y-4 p-4">
                    {Array.from({ length: 8 }, (_, index) => (
                      <Skeleton
                        key={index}
                        className="h-4"
                        style={{
                          width: `${[85, 65, 92, 48, 76, 55, 70, 35][index]}%`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ) : keysError ? (
              <ErrorScreen refetch={refetch} />
            ) : (
              <div className="mx-auto w-fit space-y-4 pt-2">
                <IntegrationSelector
                  value={activeIntegration}
                  onChange={handleIntegrationChange}
                />

                <div className="w-[min(42rem,calc(100vw-3rem))] overflow-hidden border-2 border-dashed">
                  <div className="bg-input/20 flex items-center justify-between border-b-2 border-dashed px-4 py-2">
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="size-3 shrink-0 rounded-full bg-red-400" />
                      <span className="size-3 shrink-0 rounded-full bg-yellow-400" />
                      <span className="size-3 shrink-0 rounded-full bg-green-400" />

                      <span className="text-muted-foreground ml-2 truncate text-xs">
                        {integration.filename}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        title={masked ? 'Show API key' : 'Hide API key'}
                        onClick={() => setMasked((current) => !current)}
                      >
                        {masked ? (
                          <EyeIcon key="show" className="copy-icon-animate" />
                        ) : (
                          <EyeOffIcon
                            key="hide"
                            className="copy-icon-animate"
                          />
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        title="Copy script"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <CheckIcon
                            key="check"
                            className="copy-icon-animate"
                          />
                        ) : (
                          <CopyIcon key="copy" className="copy-icon-animate" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-background overflow-auto">
                    <CodeBlock
                      code={previewCode}
                      language={integration.language}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
