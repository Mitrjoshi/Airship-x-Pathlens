import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from '../-components/home-layout'
import { DotLayout } from '../-components/dot-layout'
import { CareerHero } from '../-careers/career-hero'

export const Route = createFileRoute('/(open)/careers/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto w-[75%] border-x-2 border-dashed">
            <CareerHero />
          </div>
        </DotLayout>
      </HomeLayout>
    </>
  )
}
