import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { ButtonGroup } from '@workspace/ui/components/button-group'
import { Input } from '@workspace/ui/components/input'
import { Separator } from '@workspace/ui/components/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@workspace/ui/components/tooltip'
import {
  ArrowLeftIcon,
  SmartphoneIcon,
  Redo2Icon,
  Undo2Icon,
  TabletIcon,
  MonitorIcon,
  Edit2Icon,
  EyeIcon,
  Code2Icon,
} from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/ab-testing/new'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()

  const [previewDevice, setPreviewDevice] = useState<
    'mobile' | 'tablet' | 'desktop'
  >('desktop')

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="bg-background sticky z-10 flex items-center justify-between border-b p-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.history.back()}
          >
            <ArrowLeftIcon />
          </Button>

          <Separator orientation="vertical" />

          <Input className="w-60" placeholder="Enter version name..." />
        </div>

        <Button>Save Changes</Button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between p-2 px-4">
            <div className="flex items-center gap-2">
              <Button variant={'outline'}>
                <Edit2Icon /> Edit
              </Button>

              <Button variant={'outline'}>
                <EyeIcon /> View
              </Button>

              <Separator orientation="vertical" />

              <Button disabled variant={'outline'}>
                <Code2Icon /> Code
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <ButtonGroup className="rounded-lg border">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        onClick={() => setPreviewDevice('mobile')}
                        size="icon"
                        variant={
                          previewDevice === 'mobile' ? 'secondary' : 'ghost'
                        }
                      >
                        <SmartphoneIcon
                          className={`${previewDevice === 'mobile' ? 'text-foreground' : 'text-muted-foreground'} duration-200`}
                        />
                      </Button>
                    }
                  />
                  <TooltipContent>Mobile</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        onClick={() => setPreviewDevice('tablet')}
                        size="icon"
                        variant={
                          previewDevice === 'tablet' ? 'secondary' : 'ghost'
                        }
                      >
                        <TabletIcon
                          className={`${previewDevice === 'tablet' ? 'text-foreground' : 'text-muted-foreground'} duration-200`}
                        />
                      </Button>
                    }
                  />
                  <TooltipContent>Tab</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        onClick={() => setPreviewDevice('desktop')}
                        size="icon"
                        variant={
                          previewDevice === 'desktop' ? 'secondary' : 'ghost'
                        }
                      >
                        <MonitorIcon
                          className={`${previewDevice === 'desktop' ? 'text-foreground' : 'text-muted-foreground'} duration-200`}
                        />
                      </Button>
                    }
                  />
                  <TooltipContent>Desktop</TooltipContent>
                </Tooltip>
              </ButtonGroup>

              <Separator orientation="vertical" />

              <ButtonGroup>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button size="icon" variant={'outline'}>
                        <Undo2Icon />
                      </Button>
                    }
                  />
                  <TooltipContent>Undo</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button size="icon" variant={'outline'}>
                        <Redo2Icon />
                      </Button>
                    }
                  />
                  <TooltipContent>Redo</TooltipContent>
                </Tooltip>
              </ButtonGroup>
            </div>
          </div>
          <div className="bg-sidebar flex-1 border-t"></div>
        </main>

        <aside className="bg-background flex w-90 shrink-0 flex-col border-l"></aside>
      </div>
    </div>
  )
}
