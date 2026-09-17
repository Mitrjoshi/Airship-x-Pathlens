import { Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { AnimatedWords } from '@/components/animated-words'

const words = ['Story.', 'Behavior.', 'Journey.', 'Experience.', 'Intent.']

export const Hero = () => {
  return (
    <div className="space-y-20 px-8 py-20 pb-10">
      <div className="flex items-start justify-between">
        <div className="space-y-8">
          <div>
            <p className="text-5xl font-medium">Every path has</p>
            <p className="flex items-center gap-3 text-5xl font-medium">
              a <AnimatedWords words={words} />
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-muted-foreground max-w-[40ch]">
            Understand how users interact with your product, discover where they
            struggle, and turn real behavior into better experiences.
          </p>

          <div className="flex items-center gap-2">
            <Button className="h-10 w-32" size="lg">
              Get started
            </Button>

            <Button className="h-10 w-32" size="lg" variant="outline">
              Request a demo
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-primary! flashlight-bottom line-grid-uni flex aspect-video w-full flex-col items-center justify-center space-y-6 rounded-xl">
        <p className="px-20 text-center text-5xl font-semibold text-black">
          Your users leave clues.{' '}
          <span className="block">We capture them.</span>
        </p>

        <p className="px-30 text-center text-black/80">
          Every click. Every scroll. Every hesitation. PathLens turns real user
          behavior into a clear picture of what’s working, what isn’t, and where
          people get stuck.
        </p>

        <Link to="/login">
          <Button className="h-12 rounded-full border border-white bg-white px-6 backdrop-blur-3xl duration-200 hover:border-white hover:bg-transparent">
            Start tracking for free
          </Button>
        </Link>
      </div>
    </div>
  )
}
