import { createFileRoute, Link } from '@tanstack/react-router'

import { productSections } from '../-constants/products'
import { ProductHero } from './-components/product-hero'
import { HomeLayout } from '../../-components/home-layout'
import { DotLayout } from '../../-components/dot-layout'
import { Separator } from '@workspace/ui/components/separator'
import { FewLinesOfCode } from '../../-components/few-lines-of-code'
import { HowItWorks } from './-components/how-it-works'
import { WorkFlow, type WorkflowNodeItem } from './-components/work-flow'
import { SearchIcon } from 'lucide-react'
import { Button } from '@workspace/ui/components/button'

export const Route = createFileRoute('/(open)/products/$productId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { productId } = Route.useParams()

  const productData = productSections
    .flatMap((section) => section.items)
    .find((item) => item.href === `/product/${productId}`)

  if (!productData)
    return (
      <HomeLayout className="h-[calc(100vh-5rem)]">
        <DotLayout className="h-full border-x-2 border-dashed">
          <div className="bg-background nut-top-left nut-top-right mx-auto flex h-full w-[75%] flex-col items-center justify-center border-x-2 border-dashed px-8 text-center">
            <div className="flex max-w-md flex-col items-center gap-4">
              <div className="bg-muted flex size-14 items-center justify-center rounded-full">
                <SearchIcon className="text-muted-foreground size-6" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-semibold">Product not found</h1>

                <p className="text-muted-foreground text-sm leading-relaxed">
                  The product you're looking for doesn't exist or may have been
                  moved.
                </p>
              </div>

              <Link to="/products">
                <Button className="mt-2">All Products</Button>
              </Link>
            </div>
          </div>
        </DotLayout>
      </HomeLayout>
    )

  return (
    <main>
      <ProductHero productData={productData} />

      <Separator className={'border-t-2 border-dashed bg-transparent'} />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto max-w-[75%] space-y-10 border-x-2 border-dashed pt-20">
            <WorkFlow
              nodes={productData.page.workflow?.nodes as WorkflowNodeItem[]}
              connections={productData.page.workflow?.connections}
              title={productData.page.workflow?.title}
              description={productData.page.workflow?.description}
            />
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
