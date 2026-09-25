import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/(entry)/profile')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/(entry)/profile"!</div>
}
