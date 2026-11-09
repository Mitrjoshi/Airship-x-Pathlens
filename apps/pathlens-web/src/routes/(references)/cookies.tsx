import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(references)/cookies')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(references)/cookies"!</div>
}
