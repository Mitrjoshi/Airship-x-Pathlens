import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from '../-components/home-layout'
import { DotLayout } from '../-components/dot-layout'
import { CareerHero } from '../-careers/career-hero'
import { CompanyPrinciple } from '../-careers/company-principle'
import { Separator } from '@workspace/ui/components/separator'
import { HowWeWork } from '../-careers/how-we-work'

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

      <Separator className={'border-t-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <div className="bg-background mx-auto w-[75%]">
          <CompanyPrinciple />
        </div>
      </HomeLayout>

      <Separator className={'border-t-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <div className="bg-background mx-auto w-[75%]">
          <HowWeWork />
        </div>
      </HomeLayout>
    </>
  )
}
