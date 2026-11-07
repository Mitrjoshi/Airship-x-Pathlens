export const HowWeWork = () => {
  return (
    <div className="nut-all space-y-10 border-x-2 border-dashed p-10 py-20">
      <div className="space-y-2">
        <p className="mx-auto w-fit text-4xl font-medium">
          How & Where We Work
        </p>
        <p className="text-muted-foreground mx-auto max-w-[75ch] text-center">
          We empower our employees to do their best work, wherever they are. Our
          flexible approach ensures equitable and inclusive working arrangements
          across the globe.
        </p>
      </div>

      <div className="nut-all bg-sidebar/70 border-2 border-dashed p-2">
        <div className="bg-background grid grid-cols-3 divide-x-2 divide-dashed rounded-md border-2 border-dashed">
          <div className="p-4 font-medium">
            <p>In-Hub</p>
            <p className="text-muted-foreground text-sm">
              Split your time between home and your local Cloudflare office.
              Each team determines the cadence that works best.
            </p>
          </div>
          <div className="p-4 font-medium">
            <p>Hybrid</p>
            <p className="text-muted-foreground text-sm">
              Work from a Cloudflare Hub a few days per week with the
              flexibility to work remotely the rest of the time.
            </p>
          </div>
          <div className="p-4 font-medium">
            <p>Distributed</p>
            <p className="text-muted-foreground text-sm">
              Work from anywhere in your country of employment. No Hub location
              required — some roles are fully remote.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
