import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from '../(open)/-components/home-layout'
import { DotLayout } from '../(open)/-components/dot-layout'

export const Route = createFileRoute('/docs/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto max-w-[75%] border-x-2 border-dashed p-20">
            <p className="text-4xl font-semibold">Pathlens Docs</p>
            <p className="text-muted-foreground">
              Explore guides and tutorials to start tracking on Pathlens's
              platform
            </p>
          </div>
        </DotLayout>
      </HomeLayout>
    </>
  )
}
