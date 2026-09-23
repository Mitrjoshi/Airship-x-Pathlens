import { createFileRoute, Link } from '@tanstack/react-router'
import { HomeLayout } from '../../-components/home-layout'
import { DotLayout } from '../../-components/dot-layout'
import { solutionSections } from '../-constants/solutions'
import { SearchIcon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'
import { SolutionHero } from './-components/solution-hero'
import { Separator } from '@workspace/ui/components/separator'
import { FewLinesOfCode } from '../../-components/few-lines-of-code'
import { BuiltFor } from './-components/built-for'

export const Route = createFileRoute('/(open)/solutions/$solutionId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { solutionId } = Route.useParams()

  const solutionData = solutionSections
    .flatMap((section) => section.items)
    .find((item) => item.href === `/solutions/${solutionId}`)

  if (!solutionData)
    return (
      <HomeLayout className="h-[calc(100vh-5rem)]">
        <DotLayout className="h-full border-x-2 border-dashed">
          <div className="bg-background nut-top-left nut-top-right mx-auto flex h-full w-[75%] flex-col items-center justify-center border-x-2 border-dashed px-8 text-center">
            <div className="flex max-w-md flex-col items-center gap-4">
              <div className="bg-muted flex size-14 items-center justify-center rounded-full">
                <SearchIcon className="text-muted-foreground size-6" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold">Solution not found</h1>

                <p className="text-muted-foreground text-sm leading-relaxed">
                  The solution you're looking for doesn't exist or may have been
                  moved.
                </p>
              </div>

              <Link to="/solutions">
                <Button className="mt-2">All Solutions</Button>
              </Link>
            </div>
          </div>
        </DotLayout>
      </HomeLayout>
    )

  return (
    <main>
      <SolutionHero solutionData={solutionData} />

      <Separator className={'border-t-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto max-w-[75%] space-y-10 border-x-2 border-dashed px-10 py-20">
            <BuiltFor />
          </div>
        </DotLayout>
      </HomeLayout>

      <HomeLayout>
        <DotLayout className="border-x-2 border-t-2 border-dashed">
          <div className="bg-background mx-auto max-w-[75%] border-x-2 border-dashed p-20">
            <FewLinesOfCode />
          </div>
        </DotLayout>
      </HomeLayout>
    </main>
  )
}
