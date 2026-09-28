import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/(entry)/billing')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div>
      <div className="mx-auto max-w-4xl pt-10">
        <div className="space-y-5">
          <p className="text-2xl font-semibold">Billing</p>

          <div></div>
        </div>
      </div>
    </div>
  )
}
