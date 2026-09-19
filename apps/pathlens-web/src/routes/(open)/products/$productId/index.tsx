import { createFileRoute } from '@tanstack/react-router'

import { productSections } from '../-constants/products'
import { ProductHero } from './-components/product-hero'
import { HomeLayout } from '../../-components/home-layout'
import { DotLayout } from '../../-components/dot-layout'
import { Separator } from '@workspace/ui/components/separator'

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
        <DotLayout className="nut-top-left nut-top-right border-x-2 border-dashed">
          <div className="bg-background relative mx-auto w-[75%] border-x-2 border-dashed p-10">
            {/* <div className="nut-all grid grid-cols-3 divide-x border">
              {productData.page.highlights.map((item, index) => (
                <div key={index} className="space-y-4 p-10">
                  <p className="">{item.label}</p>
                  <p className="">{item.value}</p>
                </div>
              ))}
            </div> */}
          </div>
        </DotLayout>
      </HomeLayout>
    </main>
  )
}
