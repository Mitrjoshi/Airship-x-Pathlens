import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(open)/careers')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(open)/careers"!</div>
}
