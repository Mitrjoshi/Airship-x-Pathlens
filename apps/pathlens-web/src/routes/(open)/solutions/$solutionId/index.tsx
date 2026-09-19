import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from '../../-components/home-layout'
import { DotLayout } from '../../-components/dot-layout'

export const Route = createFileRoute('/(open)/solutions/$solutionId/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background nut-top-left nut-top-right mx-auto w-[75%] border-x-2 border-dashed p-40"></div>
        </DotLayout>
      </HomeLayout>
    </>
  )
}
