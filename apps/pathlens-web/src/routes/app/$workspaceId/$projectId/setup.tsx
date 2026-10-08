import { createFileRoute } from '@tanstack/react-router'
import {
  CodeBlock,
  integrations,
} from '@/routes/(open)/-components/few-lines-of-code'
import { CheckIcon, CopyIcon, EyeIcon, EyeOffIcon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { IntegrationSelector } from './api-keys'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getProjectApiKeysOptions } from '@/queries/api-keys'
import { mask } from '@/utils/utils'
import { toast } from 'sonner'

export const Route = createFileRoute('/app/$workspaceId/$projectId/setup')({
  component: RouteComponent,
})

function RouteComponent() {
  const { projectId } = Route.useParams()

  const [activeIntegration, setActiveIntegration] = useState('html')
  const [copied, setCopied] = useState(false)
  const [masked, setMasked] = useState(true)

  const { data: keysData, isLoading: keysLoading } = useQuery(
    getProjectApiKeysOptions(projectId)
  )

  const apiKeys = keysData?.data
  const apiKey = apiKeys && apiKeys[0]?.secret

  if (keysLoading && !apiKeys?.length && !apiKey) {
    return 'loading...'
  }

  const integration =
    integrations.find((item) => item.id === activeIntegration) ??
    integrations[0]!

  const actualCode = integration.code.replace('plk_********', apiKey)

  const previewCode = integration.code.replace(
    'plk_********',
    masked ? mask(apiKey) : apiKey
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(actualCode)

      setCopied(true)

      toast.success('Script copied successfully')

      window.setTimeout(() => {
        setCopied(false)
      }, 1500)
    } catch {
      toast.error('Failed to copy script')
    }
  }

  return (
    <div className="flex h-[calc(100dvh-57px)] items-center justify-center">
      <div>
        <div className="space-y-4 pt-2">
          <IntegrationSelector
            value={activeIntegration}
            onChange={setActiveIntegration}
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
                  onClick={() => {
                    setMasked((current) => !current)
                  }}
                >
                  {masked ? (
                    <EyeIcon key="show" className="copy-icon-animate" />
                  ) : (
                    <EyeOffIcon key="hide" className="copy-icon-animate" />
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
                    <CheckIcon key="check" className="copy-icon-animate" />
                  ) : (
                    <CopyIcon key="copy" className="copy-icon-animate" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-background max-h-80 overflow-auto">
              <CodeBlock code={previewCode} language={integration.language} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
