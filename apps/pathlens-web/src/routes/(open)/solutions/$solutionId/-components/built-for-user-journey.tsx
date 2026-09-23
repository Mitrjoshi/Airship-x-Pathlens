import { WaypointsIcon } from 'lucide-react'

export const BuiltForUserJourney = () => {
  return (
    <div className="group">
      <div className="flex h-full flex-col justify-between gap-8 overflow-hidden">
        <div className="p-5">
          <p className="text-muted-foreground font-medium">
            <WaypointsIcon className="mr-2 inline-block" size={18} />
            User Journeys
          </p>

          <p className="text-muted-foreground mt-2 text-sm">
            Understand the paths people take, where they continue, and where
            they <span className="text-foreground">leave</span>.
          </p>
        </div>

        <div className="dots-grid-uni bg-primary flashlight-bottom relative aspect-square w-full overflow-hidden"></div>
      </div>
    </div>
  )
}
