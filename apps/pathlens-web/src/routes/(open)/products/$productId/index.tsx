import { createFileRoute } from '@tanstack/react-router'
import { HomeLayout } from '../../-components/home-layout'
import { DotLayout } from '../../-components/dot-layout'
import { productSections } from '../-constants/products'
import { type LucideIcon } from 'lucide-react'
import { AnimatedDashedLine } from '../../-components/why-choose-us'
import { Button } from '@workspace/ui/components/button'

export const Route = createFileRoute('/(open)/products/$productId/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { productId } = Route.useParams()

  const productData = productSections
    .flatMap((section) => section.items)
    .find((item) => item.href === `/product/${productId}`)

  const ProductIcon = productData?.icon as LucideIcon

  return (
    <>
      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <div className="bg-background mx-auto h-screen w-[75%] border-x-2 border-dashed">
            <div className="py-10">
              <div className="dotted-background relative mx-auto w-fit mask-[radial-gradient(ellipse_at_center,black_35%,transparent_75%)] p-20 [-webkit-mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]">
                <AnimatedDashedLine
                  strokeWidth={1}
                  className="text-primary absolute top-[50%] left-0 z-5 w-full translate-y-[-50%]"
                />

                <div className="border-primary text-primary bg-primary/10 relative z-10 mx-auto flex w-fit items-center justify-center gap-4 rounded border border-dashed px-5 py-3 backdrop-blur-2xl">
                  <ProductIcon size={20} />
                  <p>{productData?.title}</p>
                </div>
              </div>
            </div>

            <div className="px-10">
              <div className="flex items-start gap-20">
                <div className="flex-1">
                  <p className="text-4xl font-medium">
                    {productData?.page.hero.title
                      .split(' ')
                      .slice(0, -1)
                      .join(' ')}{' '}
                    <span className="text-primary">
                      {productData?.page.hero.title.split(' ').at(-1)}.
                    </span>
                  </p>
                </div>

                <div className="flex flex-1 flex-col items-start space-y-5">
                  <p className="text-muted-foreground">
                    {productData?.page.hero.description}
                  </p>

                  <div className="flex items-center gap-2 pr-8">
                    <Button size="lg">
                      {productData?.page.hero.primaryAction}
                    </Button>
                    <Button size="lg" variant="outline">
                      {productData?.page.hero.secondaryAction}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DotLayout>
      </HomeLayout>
    </>
  )
}
