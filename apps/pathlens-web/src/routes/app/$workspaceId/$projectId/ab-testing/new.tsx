import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { Input } from '@workspace/ui/components/input'
import { ArrowLeftIcon, LoaderIcon } from 'lucide-react'

export const Route = createFileRoute(
  '/app/$workspaceId/$projectId/ab-testing/new'
)({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()

  return (
    <div>
      <div className="bg-background sticky top-14.25 z-10 flex items-center justify-between border-b p-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.history.back()}
          >
            <ArrowLeftIcon />
          </Button>

          <Input
            className="w-80"
            placeholder="Enter your A/B Testing name..."
          />

          <LoaderIcon className="text-muted-foreground size-5 animate-spin" />
        </div>

        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
