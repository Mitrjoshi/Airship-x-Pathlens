import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/quick-start/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/docs/quick-start/"!</div>
}
