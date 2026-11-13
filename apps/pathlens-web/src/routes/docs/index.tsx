import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <div className="h-[40dvh] border-b">
        <div className="mx-auto flex h-full max-w-[70%] items-center gap-4">
          <div className="flex-1 space-y-2">
            <p className="text-3xl font-semibold">Pathlens Documentation</p>
            <p className="text-muted-foreground">
              Lorem, ipsum dolor sit amet consectetur adipisicing elit. Unde
              sit, fugit expedita culpa repudiandae nesciunt consectetur.
              Obcaecati dolores commodi perspiciatis illo cum sunt magni sequi
              earum quos! Sit, nihil ullam.
            </p>
          </div>
          <div className="flex-1"></div>
        </div>
      </div>
    </>
  )
}
