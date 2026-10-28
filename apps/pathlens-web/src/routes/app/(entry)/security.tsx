import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/(entry)/security')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/(entry)/security"!</div>
}
