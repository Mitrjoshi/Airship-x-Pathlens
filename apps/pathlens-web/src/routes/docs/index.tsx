import { createFileRoute, Link } from '@tanstack/react-router'
import { Separator } from '@workspace/ui/components/separator'
import { HomeLayout } from '../(open)/-components/home-layout'
import { DotLayout } from '../(open)/-components/dot-layout'
import AnimatedLogo from '@/components/common/animated-logo'
import { Button } from '@workspace/ui/components/button'

export const Route = createFileRoute('/docs/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <>
      <div className="mx-auto max-w-[100rem] p-20 py-10">
        <div className="mx-auto flex max-w-[75%] items-center justify-between gap-4">
          <div>
            <p className="text-4xl font-semibold">Pathlens Documentation</p>
            <p className="text-muted-foreground">
              Everything you need to integrate, configure, and get the most out
              of Pathlens.
            </p>

            <Button render={<Link to="/docs/guides" />} className={'mt-5'}>
              Getting Started
            </Button>
          </div>
          <div>
            <AnimatedLogo size={220} />
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
