import { GlobeIcon, MousePointer2, Route } from 'lucide-react'

import { AnimatedWords } from '@/components/animated-words'
import { RegionGlobe } from './region-globe'

export const Region = () => {
  return (
    <div className="space-y-20 px-8 py-20 pb-10">
      <div className="space-y-2">
        <p className="mx-auto flex w-fit items-center gap-2 text-center text-4xl font-medium">
          Region:{' '}
          <AnimatedWords
            words={['Connected', 'Mapped', 'Tracked', 'Visible', 'Borderless']}
          />
        </p>

        <p className="text-muted-foreground text-center">
          One smart network for tracking user behavior — from every click to
          every journey, in real time.
        </p>
      </div>

      <div>
        <RegionGlobe />
        <div className="nut-all bg-background grid grid-cols-3 divide-x border">
          <div className="w-full p-4">
            <GlobeIcon size={24} className="text-muted-foreground" />

            <p className="mt-4 text-lg font-medium">Know where users are</p>

            <p className="text-muted-foreground">
              Understand where your users come from with real-time location,
              device, and browser insights across your entire product.
            </p>
          </div>

          <div className="w-full p-4">
            <MousePointer2 size={24} className="text-muted-foreground" />

            <p className="mt-4 text-lg font-medium">See what they do</p>

            <p className="text-muted-foreground">
              Capture clicks, scrolls, inputs, and interactions automatically
              without manually setting up every event.
            </p>
          </div>

          <div className="w-full p-4">
            <Route size={24} className="text-muted-foreground" />

            <p className="mt-4 text-lg font-medium">Understand their journey</p>

            <p className="text-muted-foreground">
              Follow how users move through your product, find friction points,
              and turn real behavior into actionable insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
