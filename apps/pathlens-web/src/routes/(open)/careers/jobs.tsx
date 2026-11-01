import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from '../-components/home-layout'
import { DotLayout } from '../-components/dot-layout'
import { JobsHero } from '../-careers/jobs-hero'
import { Separator } from '@workspace/ui/components/separator'
import { RolesTable } from '../-careers/roles-table'

export const Route = createFileRoute('/(open)/careers/jobs')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <HomeLayout>
        <div className="bg-background mx-auto w-[75%]">
          <JobsHero />
        </div>
      </HomeLayout>

      <Separator className={'border-t-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto w-[75%] border-x-2 border-dashed">
            <RolesTable />
          </div>
        </DotLayout>
      </HomeLayout>
    </>
  )
}
