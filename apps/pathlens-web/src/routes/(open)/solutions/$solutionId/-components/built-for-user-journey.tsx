export const BuiltForUserJourney = () => {
  return (
    <div className="group h-full">
      <div className="flex h-full flex-col justify-between overflow-hidden">
        {/* Heading */}
        <div className="p-5">
          <p className="font-medium">User Journeys</p>

          <p className="text-muted-foreground text-sm">
            Understand the paths people take, where they continue, and where
            they <span className="text-foreground">leave</span>.
          </p>
        </div>

        {/* Journey preview */}
        <div className="bg-card/20 relative aspect-square w-full overflow-hidden border-t-2 border-dashed"></div>
      </div>
    </div>
  )
}
