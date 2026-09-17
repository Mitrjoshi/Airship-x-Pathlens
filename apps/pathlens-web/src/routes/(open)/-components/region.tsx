import { Globe, MousePointer2, Route } from 'lucide-react'

export const Region = () => {
  return (
    <div className="space-y-20 px-8 py-20">
      <div className="space-y-2">
        <p className="text-center text-4xl font-medium">
          Region: <span className="text-primary">Everywhere</span>
        </p>

        <p className="text-muted-foreground text-center">
          One smart network for tracking user behavior — from every click to
          every journey, in real time.
        </p>
      </div>

      <div className="nut-all grid grid-cols-3 divide-x border">
        <div className="w-full p-4">
          <Globe size={24} className="text-muted-foreground" />
          <p className="mt-2 text-lg font-medium">Know where users are</p>
          <p className="text-muted-foreground">
            Understand where your users come from with real-time location,
            device, and browser insights across your entire product.
          </p>
        </div>

        <div className="w-full p-4">
          <MousePointer2 size={24} className="text-muted-foreground" />
          <p className="mt-2 text-lg font-medium">See what they do</p>
          <p className="text-muted-foreground">
            Capture clicks, scrolls, inputs, and interactions automatically
            without manually setting up every event.
          </p>
        </div>

        <div className="w-full p-4">
          <Route size={24} className="text-muted-foreground" />
          <p className="mt-2 text-lg font-medium">Understand their journey</p>
          <p className="text-muted-foreground">
            Follow how users move through your product, find friction points,
            and turn real behavior into actionable insights.
          </p>
        </div>
      </div>
    </div>
  )
}
