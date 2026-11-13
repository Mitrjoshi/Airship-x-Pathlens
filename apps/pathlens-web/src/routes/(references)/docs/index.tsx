import { DotLayout } from '@/routes/(open)/-components/dot-layout'
import { HomeLayout } from '@/routes/(open)/-components/home-layout'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(references)/docs/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto max-w-[75%] border-x-2 border-dashed">
            <div className="p-10">
              <p className="text-2xl font-semibold">Documentation</p>
            </div>
          </div>
        </DotLayout>
      </HomeLayout>
    </>
  )
}
