import { Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'
import { AnimatedWords } from '@/components/animated-words'
import { useCallback, useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  ActivityIcon,
  BrainIcon,
  BugIcon,
  EyeIcon,
  FingerprintIcon,
  LockKeyholeIcon,
  MousePointer2Icon,
  MousePointerClickIcon,
  RouteIcon,
  ScanSearchIcon,
  SearchIcon,
  ShieldCheckIcon,
} from 'lucide-react'

const words = ['Story.', 'Behavior.', 'Journey.', 'Experience.', 'Intent.']

export const Hero = () => {
  return (
    <>
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
              Understand how users interact with your product, discover where
              they struggle, and turn real behavior into better experiences.
            </p>

            <div className="flex items-center gap-2">
              <Button className="w-32">Get started</Button>

              <Button className="w-32" variant="outline">
                Request a demo
              </Button>
            </div>
          </div>
        </div>

        <HeroIcons />
      </div>
    </>
  )
}

export const HeroIcons = () => {
  return (
    <div className="bg-primary dots-grid-uni rounded-xl">
      <div className="flashlight-bottom @container relative flex w-full flex-col items-center justify-center space-y-6 overflow-hidden py-32">
        <IconAnimations />
        <div className="relative z-10 flex max-w-3xl flex-col items-center space-y-6">
          <p className="text-center text-5xl font-semibold text-black">
            Your users leave clues.{' '}
            <span className="block">We capture them.</span>
          </p>

          <p className="max-w-2xl text-center text-black/80">
            Every click. Every scroll. Every hesitation. Pathlens turns real
            user behavior into a clear picture of what’s working, what isn’t,
            and where people get stuck.
          </p>

          <Link to="/login">
            <Button className="h-12 rounded-full border border-white bg-white px-6 text-black backdrop-blur-3xl duration-200 hover:border-white hover:bg-transparent">
              Start tracking for free
            </Button>
          </Link>
        </div>
      </div>

      <div className="bg-primary border-t-[0.5px] border-black/20 p-2">
        <div className="marquee-track flex w-max items-center gap-10">
          {[
            'Session insights',
            'Behavior analytics',
            'Journey tracking',
            'Friction detection',
            'Privacy-first',
            'Real user signals',
            'Session insights',
            'Behavior analytics',
            'Journey tracking',
            'Friction detection',
            'Privacy-first',
            'Real user signals',
          ].map((item, index) => (
            <div
              key={`${item}-${index}`}
              className="flex shrink-0 items-center gap-10"
            >
              <span className="text-sm tracking-wide text-black/80">
                {item}
              </span>

              <span className="size-1.5 rounded-full bg-black/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const iconPool = [
  MousePointer2Icon,
  BugIcon,
  BrainIcon,
  LockKeyholeIcon,
  ScanSearchIcon,
  ShieldCheckIcon,
  ActivityIcon,
  EyeIcon,
  FingerprintIcon,
  MousePointerClickIcon,
  RouteIcon,
  SearchIcon,
]

const icons = [
  {
    x: '-40cqw',
    y: '-120px',
    rotate: '-12deg',
    floatX: '-14px',
    floatY: '-10px',
    floatRotate: '-4deg',
    duration: '4.2s',
    delay: '0ms',
  },
  {
    x: '-36cqw',
    y: '10px',
    rotate: '10deg',
    floatX: '12px',
    floatY: '-14px',
    floatRotate: '5deg',
    duration: '5s',
    delay: '100ms',
  },
  {
    x: '-40cqw',
    y: '140px',
    rotate: '-8deg',
    floatX: '-10px',
    floatY: '12px',
    floatRotate: '-3deg',
    duration: '4.6s',
    delay: '200ms',
  },
  {
    x: '40cqw',
    y: '-120px',
    rotate: '12deg',
    floatX: '14px',
    floatY: '-8px',
    floatRotate: '4deg',
    duration: '5.2s',
    delay: '50ms',
  },
  {
    x: '36cqw',
    y: '10px',
    rotate: '-10deg',
    floatX: '-12px',
    floatY: '14px',
    floatRotate: '-5deg',
    duration: '4.4s',
    delay: '150ms',
  },
  {
    x: '40cqw',
    y: '140px',
    rotate: '8deg',
    floatX: '10px',
    floatY: '10px',
    floatRotate: '3deg',
    duration: '5.4s',
    delay: '250ms',
  },
]

type IconStyle = CSSProperties & {
  '--x': string
  '--y': string
  '--rotate': string
  '--float-x': string
  '--float-y': string
  '--float-rotate': string
  '--duration': string
  '--delay': string
}

const FloatingIcon = ({
  index,
  iconIndex,
  onChange,
  ...position
}: (typeof icons)[number] & {
  index: number
  iconIndex: number
  onChange: (index: number) => void
}) => {
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    const changeIcon = () => {
      onChange(index)

      timeout = setTimeout(changeIcon, 2000 + Math.random() * 3000)
    }

    timeout = setTimeout(changeIcon, 1500 + Math.random() * 2500)

    return () => clearTimeout(timeout)
  }, [index, onChange])

  const Icon = iconPool[iconIndex]

  return (
    <div
      className="floating-icon bg-primary-foreground/15 absolute top-1/2 left-1/2 aspect-square rounded-xl border border-dashed border-white p-4 opacity-80 backdrop-blur-3xl"
      style={
        {
          '--x': position.x,
          '--y': position.y,
          '--rotate': position.rotate,
          '--float-x': position.floatX,
          '--float-y': position.floatY,
          '--float-rotate': position.floatRotate,
          '--duration': position.duration,
          '--delay': position.delay,
        } as IconStyle
      }
    >
      <Icon key={iconIndex} className="icon-switch size-6 text-white" />
    </div>
  )
}

export const IconAnimations = () => {
  const [visibleIcons, setVisibleIcons] = useState<number[]>(() =>
    icons.map((_, index) => index % iconPool.length)
  )

  const changeIcon = useCallback((positionIndex: number) => {
    setVisibleIcons((currentIcons) => {
      const usedIcons = new Set(
        currentIcons.filter((_, index) => index !== positionIndex)
      )

      const currentIcon = currentIcons[positionIndex]

      const availableIcons = iconPool
        .map((_, index) => index)
        .filter((index) => !usedIcons.has(index) && index !== currentIcon)

      if (!availableIcons.length) {
        return currentIcons
      }

      const nextIcon =
        availableIcons[Math.floor(Math.random() * availableIcons.length)]

      const nextIcons = [...currentIcons]
      nextIcons[positionIndex] = nextIcon

      return nextIcons
    })
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {icons.map((icon, index) => (
        <FloatingIcon
          key={index}
          index={index}
          iconIndex={visibleIcons[index]}
          onChange={changeIcon}
          {...icon}
        />
      ))}
    </div>
  )
}
