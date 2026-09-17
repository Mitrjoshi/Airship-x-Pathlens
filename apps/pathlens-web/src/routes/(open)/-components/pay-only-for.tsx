import { motion } from 'motion/react'
import { AnimatedDashedLine } from './why-choose-us'
import {
  Globe2Icon,
  KeyIcon,
  MousePointer2Icon,
  ScrollTextIcon,
} from 'lucide-react'
import { AnimatedWords } from '@/components/animated-words'

const words = ['Analytics', 'Insights', 'Behavior', 'Performance', 'Clarity']

export const PayOnlyFor = () => {
  return (
    <div className="">
      <div className="space-y-2 px-8 py-20">
        <motion.p className="mx-auto flex w-fit items-center gap-2 text-center text-4xl font-medium">
          Pay only for <AnimatedWords words={words} />
        </motion.p>

        <p className="text-muted-foreground text-center">
          Everything you need to understand your users, without the complexity.
        </p>
      </div>

      <div className="nut-all grid grid-cols-2 items-center gap-8 border px-10 py-12">
        <div>
          <p className="text-lg font-medium">Track everything that matters</p>
          <p className="text-muted-foreground text-sm">
            Add one lightweight script to your website and PathLens
            automatically captures the interactions that matter — clicks,
            scrolls, form changes, invalid inputs, and live visitors.
          </p>
        </div>

        <div className="nut-all space-y-2 border p-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">Live activity</p>
            <p className="text-primary text-sm">Your website</p>
          </div>

          <div className="relative grid grid-cols-4 gap-8">
            <div className="bg-background z-10 flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed">
              <Globe2Icon className="text-muted-foreground" />
              <p className="text-sm">Sessions</p>
            </div>

            <div className="bg-background z-10 flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed">
              <MousePointer2Icon className="text-muted-foreground" />
              <p className="text-sm">Clicks</p>
            </div>

            <div className="bg-background z-10 flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed">
              <ScrollTextIcon className="text-muted-foreground" />
              <p className="text-sm">Reports</p>
            </div>

            <div className="bg-background z-10 flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed">
              <KeyIcon className="text-muted-foreground" />
              <p className="text-sm">Privacy</p>
            </div>

            <AnimatedDashedLine className="text-foreground/20 absolute top-[50%] w-full translate-y-[-50%]" />
          </div>

          <p className="text-muted-foreground mt-4 text-center text-sm">
            One script. Every interaction. Zero manual event setup.
          </p>
        </div>
      </div>
    </div>
  )
}
