import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from './-components/home-layout'
import { Separator } from '@workspace/ui/components/separator'
import { Hero } from './-components/hero'
import { WhyChooseUs } from './-components/why-choose-us'
import { DotLayout } from './-components/dot-layout'
import { Region } from './-components/region'
import { FewLinesOfCode } from './-components/few-lines-of-code'
import { BuiltFor } from './solutions/$solutionId/-components/built-for'
import { WebsitesTracking } from './-components/websites-tracking'
import { Testimonials } from './-components/testimonials'

export const Route = createFileRoute('/(open)/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto border-dashed md:w-[75%] md:border-x-2">
            <Hero />
          </div>
        </DotLayout>
      </HomeLayout>

      <HomeLayout>
        <DotLayout className="border-x-2 border-t-2 border-dashed">
          <div className="bg-background md:nut-top-left md:nut-bottom-right mx-auto space-y-10 border-dashed p-5 py-20 md:max-w-[75%] md:border-x-2 md:px-10">
            <BuiltFor />
          </div>
        </DotLayout>
      </HomeLayout>

      <HomeLayout className="border-x-2 border-t-2 border-dashed">
        <DotLayout>
          <div className="bg-background md:nut-top-left md:nut-bottom-right mx-auto border-dashed md:w-[75%] md:border-x-2">
            <Region />
          </div>
        </DotLayout>
      </HomeLayout>

      <Separator className={'border-t-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background md:nut-top-left mx-auto border-dashed md:w-[75%] md:border-x-2">
            <WhyChooseUs />
          </div>
        </DotLayout>
      </HomeLayout>

      <HomeLayout>
        <DotLayout className="border-x-2 border-t-2 border-dashed">
          <div className="bg-background md:nut-top-left mx-auto border-dashed px-8 py-20 md:max-w-[75%] md:border-x-2 md:px-20">
            <FewLinesOfCode />
          </div>
        </DotLayout>
      </HomeLayout>

      <Separator className={'border-t-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background md:nut-bottom-right mx-auto border-dashed md:w-[75%] md:border-x-2">
            <Testimonials />
          </div>
        </DotLayout>
      </HomeLayout>

      <Separator className={'border-t-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background md:nut-bottom-right md:nut-top-left mx-auto border-dashed md:w-[75%] md:border-x-2">
            <WebsitesTracking />
          </div>
        </DotLayout>
      </HomeLayout>
    </>
  )
}
