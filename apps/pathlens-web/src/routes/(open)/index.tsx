import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from './-components/home-layout'
import { Separator } from '@workspace/ui/components/separator'
import { Hero } from './-components/hero'
import { WhyChooseUs } from './-components/why-choose-us'
import { DotLayout } from './-components/dot-layout'
import { PayOnlyFor } from './-components/pay-only-for'
import { Region } from './-components/region'
import { Features } from './-components/features'
import { FewLinesOfCode } from './-components/few-lines-of-code'

export const Route = createFileRoute('/(open)/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto w-[75%] border-x-2 border-dashed">
            <Hero />
          </div>
        </DotLayout>
      </HomeLayout>

      <HomeLayout className="border-x-2 border-t-2 border-dashed">
        <DotLayout>
          <div className="bg-background nut-top-left nut-bottom-right mx-auto w-[75%] border-x-2 border-dashed">
            <Region />
          </div>
        </DotLayout>
      </HomeLayout>

      <HomeLayout>
        <DotLayout className="border-x-2 border-t-2 border-dashed">
          <div className="bg-background nut-top-left mx-auto max-w-[75%] border-x-2 border-dashed p-20">
            <FewLinesOfCode />
          </div>
        </DotLayout>
      </HomeLayout>

      <HomeLayout>
        <DotLayout className="border-x-2 border-t-2 border-dashed">
          <div className="bg-background nut-top-left mx-auto w-[75%] border-x-2 border-dashed">
            <Features />
          </div>
        </DotLayout>
      </HomeLayout>

      <Separator className={'border-t-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background nut-top-left mx-auto w-[75%] border-x-2 border-dashed">
            <WhyChooseUs />
          </div>
        </DotLayout>
      </HomeLayout>

      <Separator className={'border-t-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background nut-bottom-right mx-auto w-[75%] border-x-2 border-dashed">
            <PayOnlyFor />
          </div>
        </DotLayout>
      </HomeLayout>
    </>
  )
}
