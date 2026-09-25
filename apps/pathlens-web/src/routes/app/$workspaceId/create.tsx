import { createFileRoute, useLocation, useRouter } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { ArrowLeftIcon } from 'lucide-react'

export const Route = createFileRoute('/app/$workspaceId/create')({
  component: RouteComponent,
})

function RouteComponent() {
  const router = useRouter()

  return (
    <div>
      <div className="mx-auto max-w-4xl pt-10">
        <div className="space-y-5">
          <div className="space-y-2">
            <Button
              onClick={() => {
                router.history.back()
              }}
              variant="outline"
            >
              <ArrowLeftIcon />
              Back
            </Button>
            <p className="text-2xl font-medium">Create a new project</p>
          </div>
        </div>
      </div>
    </div>
  )
}
