import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from '../(open)/-components/home-layout'
import { DotLayout } from '../(open)/-components/dot-layout'
import { Separator } from '@workspace/ui/components/separator'
import { TitleReveal } from '../(open)/products/$productId/-components/title-reveal'

export const Route = createFileRoute('/docs/change-log')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto max-w-[75%] border-x-2 border-dashed p-20">
            <div className="mx-auto w-fit">
              <div>
                <TitleReveal
                  title="Changelog"
                  description="Stay up to date with the latest features, improvements, and fixes across Pathlens."
                  className="flex flex-col gap-2 text-center"
                />
              </div>
            </div>
          </div>
        </DotLayout>
      </HomeLayout>

      <Separator className="border-b-2 border-dashed bg-transparent" />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto max-w-[75%] border-x-2 border-dashed p-20"></div>
        </DotLayout>
      </HomeLayout>
    </>
  )
}
