import { createFileRoute } from '@tanstack/react-router'
import { Separator } from '@workspace/ui/components/separator'
import { HomeLayout } from '../(open)/-components/home-layout'
import { DotLayout } from '../(open)/-components/dot-layout'

export const Route = createFileRoute('/docs/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <div className="mx-auto max-w-[75%] p-20">
        <div className="flex items-center gap-4">
          <div>
            <img className="size-20 shrink-0" src="/logo-border.svg" />
          </div>
          <div>
            <p className="text-4xl font-semibold">Pathlens Docs</p>
            <p className="text-muted-foreground">
              Explore guides and tutorials to start tracking on Pathlens's
              platform
            </p>
          </div>
        </div>
      </div>

      <Separator className={'border-b-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto max-w-[75%] border-x-2 border-dashed">
            <div className="p-20"></div>
          </div>
        </DotLayout>
      </HomeLayout>
    </>
  )
}
