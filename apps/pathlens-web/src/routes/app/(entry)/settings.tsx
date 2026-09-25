import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/(entry)/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/(entry)/settings"!</div>
}
