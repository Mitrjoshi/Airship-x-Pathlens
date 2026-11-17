import { DotLayout } from '@/routes/(open)/-components/dot-layout'
import { HomeLayout } from '@/routes/(open)/-components/home-layout'
import { Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'

export const NotFound = () => {
  return (
    <HomeLayout>
      <DotLayout className="border-x-2 border-dashed">
        <NotFoundHero />
      </DotLayout>
    </HomeLayout>
  )
}

export const NotFoundHero = () => {
  return (
    <main className="bg-background text-foreground relative isolate mx-auto flex min-h-[calc(100dvh-56px)] w-full flex-col overflow-hidden border-dashed md:max-w-[75%] md:border-x-2">
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <span
          className="text-primary/80 translate-y-[-12%] rotate-8 text-[clamp(12rem,39vw,40rem)] leading-none font-black whitespace-nowrap select-none"
          style={{
            WebkitTextStroke: '2px currentColor',
            WebkitTextFillColor: 'transparent',
          }}
          aria-hidden="true"
        >
          404
        </span>
      </div>

      <div className="from-background via-background/90 pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t to-transparent" />

      <div className="relative z-10 mt-auto flex flex-col items-start px-6 pb-12 sm:px-10 md:px-[6.8%] md:pb-[6%]">
        <h1 className="text-primary text-3xl leading-tight font-medium md:text-4xl">
          Page not found
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl">
          The page you were looking for does not exist or has moved.
        </p>

        <Button
          render={<Link to="/">Back to home</Link>}
          className="mt-5 rounded-full px-5"
          size="lg"
        />
      </div>
    </main>
  )
}
