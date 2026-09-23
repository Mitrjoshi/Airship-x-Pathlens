import { BuiltForVisitor } from './built-for-visitors'
import { BuiltForTrafficSource } from './built-for-traffic-source'
import { BuiltForLiveActivity } from './built-for-live-activity'
import { BuiltForUserJourney } from './built-for-user-journey'
import { BuiltForPages } from './built-for-pages'
import { BuiltForGoals } from './built-for-goals'
import { Button } from '@workspace/ui/components/button'
import { Link } from '@tanstack/react-router'

export const BuiltFor = () => {
  return (
    <div>
      <div className="max-w-[50%] space-y-2">
        <p className="text-4xl font-medium">Built for clarity</p>
        <p className="text-muted-foreground">
          Website analytics shouldn’t take hours to understand. Pathlens turns
          visits, journeys, engagement, traffic sources, and conversions into
          insights you can actually use.
        </p>
        <p className="text-muted-foreground">
          No digging through reports. No data overload. No second-guessing. Just
          clear answers about what’s happening on your website.
        </p>
      </div>

      <div className="mt-20 divide-y-2 divide-dashed border-2 border-dashed">
        <div className="nut-all grid grid-cols-[1.3fr_1fr] divide-x-2 divide-dashed">
          <div className="nut-top-right">
            <BuiltForVisitor />
          </div>
          <div className="nut-bottom-left">
            <BuiltForTrafficSource />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr] divide-x-2 divide-dashed">
          <div className="nut-top-right nut-bottom-left">
            <BuiltForLiveActivity />
          </div>
          <div className="nut-top-right">
            <BuiltForUserJourney />
          </div>
          <div className="nut-top-right nut-bottom-left">
            <BuiltForPages />
          </div>
        </div>

        <div className="nut-bottom-left grid grid-cols-[1fr_2fr] divide-x-2 divide-dashed">
          <div className="">
            <BuiltForGoals />
          </div>
          <div className="nut-all flex flex-col items-center justify-center space-y-8 p-10">
            <div className="space-y-2 text-center">
              <p className="text-3xl font-medium">Built for how you grow</p>
              <p className="text-muted-foreground">
                Pathlens brings your website activity, traffic, journeys,
                engagement, and conversions together in one clear view. No
                complicated analytics setup. No digging through endless reports.
                Just the insights you need to understand what’s happening and
                what to improve.
              </p>
            </div>

            <Link to="/login">
              <Button>Start Tracking</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
