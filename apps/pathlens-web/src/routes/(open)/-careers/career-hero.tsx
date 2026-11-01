import { Button } from '@workspace/ui/components/button'
import { TitleReveal } from '../products/$productId/-components/title-reveal'
import { CareerGlobe } from './career-globe'
import { Link } from '@tanstack/react-router'

export const CareerHero = () => {
  return (
    <div className="space-y-20 pt-20">
      <div className="flex flex-col items-center space-y-8">
        <TitleReveal
          title={'Pathlens Careers'}
          description={
            'Join our team and help shape the future of path planning.'
          }
          className="flex flex-col gap-2 text-center"
        />

        <Button render={<Link to="/careers/jobs" />}>See Open Positions</Button>
      </div>

      <CareerGlobe />
    </div>
  )
}
