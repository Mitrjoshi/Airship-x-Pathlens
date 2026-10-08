import { Badge } from '@workspace/ui/components/badge'
import type { ReactNode } from 'react'

type CheckoutStateCardProps = {
  eyebrow: string
  title: ReactNode
  description: string
  illustration: ReactNode
  actions: ReactNode
}

export function CheckoutStateCard({
  eyebrow,
  title,
  description,
  illustration,
  actions,
}: CheckoutStateCardProps) {
  return (
    <main className="flex min-h-screen w-full items-center justify-center">
      <div className="grid w-full max-w-6xl grid-cols-1 items-center px-6 py-12 sm:px-10 lg:grid-cols-2 lg:px-16 xl:px-20">
        {/* Content */}
        <section className="flex min-h-[420px] flex-col justify-center lg:pr-16">
          <div className="max-w-xl">
            <Badge variant={'secondary'} className="mb-4">
              {eyebrow}
            </Badge>

            <h1 className="text-4xl leading-[1.05] font-semibold tracking-[-0.04em] sm:text-5xl">
              {title}
            </h1>

            <p className="text-muted-foreground mt-6 max-w-lg text-base leading-7">
              {description}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              {actions}
            </div>
          </div>
        </section>

        {/* Illustration */}
        <section className="flex min-h-[420px] items-center justify-center lg:min-h-[520px]">
          <div className="relative flex w-full max-w-[480px] items-center justify-center">
            {/* Fixed illustration stage */}
            <div className="relative flex aspect-[480/340] w-full items-center justify-center">
              {illustration}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
