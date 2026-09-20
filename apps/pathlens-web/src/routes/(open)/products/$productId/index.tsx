import { createFileRoute } from '@tanstack/react-router'

import { productSections } from '../-constants/products'
import { ProductHero } from './-components/product-hero'
import { HomeLayout } from '../../-components/home-layout'
import { DotLayout } from '../../-components/dot-layout'
import { Separator } from '@workspace/ui/components/separator'
import { FewLinesOfCode } from '../../-components/few-lines-of-code'
import { HowItWorks } from './-components/how-it-works'
import { WorkFlow } from './-components/work-flow'

export const Route = createFileRoute('/(open)/products/$productId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { productId } = Route.useParams()

  const productData = productSections
    .flatMap((section) => section.items)
    .find((item) => item.href === `/product/${productId}`)

  if (!productData) return null

  return (
    <main>
      <ProductHero productData={productData} />

      <Separator className={'border-t-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto max-w-[75%] space-y-10 border-x-2 border-dashed p-20">
            <WorkFlow />
          </div>
        </DotLayout>
      </HomeLayout>

      <Separator className={'border-t-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <DotLayout className="nut-top-left nut-top-right border-x-2 border-dashed">
          <div className="bg-background mx-auto max-w-[75%] space-y-10 border-x-2 border-dashed p-20">
            <HowItWorks productData={productData} />
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
