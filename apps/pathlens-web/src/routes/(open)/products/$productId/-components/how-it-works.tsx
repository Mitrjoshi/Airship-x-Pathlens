import type { ProductData } from '../../-constants/products'

export const HowItWorks = ({ productData }: { productData: ProductData }) => {
  const howItWorks = productData.page.howItWorks

  if (!howItWorks) return null

  return (
    <>
      <div className="space-y-2">
        <p className="mx-auto w-fit text-4xl font-medium">{howItWorks.title}</p>

        <p className="text-muted-foreground text-center">
          {howItWorks.description}
        </p>
      </div>

      <ul className="mx-auto max-w-[75%] space-y-8">
        {howItWorks.steps.map((item, index) => (
          <li key={index} className="relative flex items-start gap-8">
            {index < howItWorks.steps.length - 1 && (
              <span className="bg-foreground/50 absolute top-12 left-6 h-[calc(100%+2rem)] w-px" />
            )}

            <p className="bg-background border-foreground/50 relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full border">
              <span className="bg-foreground/50 h-2 w-2 rounded-full" />
            </p>

            <div className="space-y-1 pt-1">
              <p className="text-lg">{item.title}</p>
              <p className="text-muted-foreground">{item.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
