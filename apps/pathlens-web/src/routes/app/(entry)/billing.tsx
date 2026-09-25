import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/(entry)/billing')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/(entry)/billing"!</div>
}
