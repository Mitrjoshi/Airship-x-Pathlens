import { Button } from '@workspace/ui/components/button'
import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import type { SolutionData } from '../../-constants/solutions'
import { TitleReveal } from '@/routes/(open)/products/$productId/-components/title-reveal'

const createWavePath = (direction: 'left' | 'right', index: number) => {
  // Much wider vertical spread at the outer edge
  const endOffsets = [-200, -150, -100, -50, 0, 50, 100, 150, 200]

  // Different wave intensity per string
  const amplitudes = [0, 0, 0, 0, 0, 0, 0, 0, 0]

  const endOffset = endOffsets[index]
  const amplitude = amplitudes[index]

  const variation = Math.random()

  const endY = 50 + endOffset

  const c1Y = 50 - amplitude + variation
  const c2Y = 50 + amplitude - variation

  if (direction === 'left') {
    return `
      M600 50
      C520 ${c1Y} 450 ${c2Y} 320 ${50 + variation}
      S140 ${endY - variation} 0 ${endY}
    `
  }

  return `
    M0 50
    C80 ${c1Y} 150 ${c2Y} 280 ${50 + variation}
    S460 ${endY - variation} 600 ${endY}
  `
}

export const SolutionHero = ({
  solutionData,
}: {
  solutionData: SolutionData
}) => {
  const ProductIcon = solutionData.icon as LucideIcon

  const leftPaths = useMemo(
    () => Array.from({ length: 9 }, (_, i) => createWavePath('left', i)),
    [solutionData.title]
  )

  const rightPaths = useMemo(
    () => Array.from({ length: 9 }, (_, i) => createWavePath('right', i)),
    [solutionData.title]
  )

  return (
    <section
      style={
        {
          '--product-color': solutionData.color.hex,
        } as React.CSSProperties
      }
      className="bg-background flashlight-bottom-low relative flex min-h-[calc(100dvh-30vh)] items-center justify-center overflow-hidden px-6 py-20"
    >
      <div
        key={solutionData.title}
        className="dotted-background center-blur-reveal pointer-events-none absolute inset-0"
        style={{
          maskImage:
            'linear-gradient(to bottom, rgba(0,0,0,0.6) 20%, rgba(0,0,0,0.6) 45%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, rgba(0,0,0,0.6) 20%, rgba(0,0,0,0.6) 45%, transparent 100%)',
        }}
      />

      <div className="relative flex w-full max-w-4xl flex-col items-center text-center">
        <div className="relative flex w-full max-w-4xl flex-col items-center text-center">
          <div
            style={{
              borderColor: solutionData.color.hex,
              backgroundColor: `${solutionData.color.hex}25`,
              color: solutionData.color.hex,
            }}
            className="bg-background/30 relative mb-8 flex w-fit items-center gap-2 rounded-md border-[1.5px] border-dashed px-4 py-2 font-medium backdrop-blur-2xl"
          >
            <ProductIcon size={16} />
            <span className="text-sm">{solutionData.title}</span>

            {/* LEFT */}
            <span
              className="connection-node bg-background absolute top-1/2 -left-1 z-20 h-2 w-2 -translate-y-1/2 border"
              style={{ borderColor: solutionData.color.hex }}
            >
              <svg
                key={solutionData.title}
                className="connection-string connection-string-left"
                viewBox="0 0 600 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {leftPaths.map((d, index) => (
                  <path
                    key={index}
                    className={`string string-${index + 1}`}
                    d={d}
                  />
                ))}
              </svg>
            </span>

            {/* RIGHT */}
            <span
              className="connection-node bg-background absolute top-1/2 -right-1 z-20 h-2 w-2 -translate-y-1/2 border"
              style={{ borderColor: solutionData.color.hex }}
            >
              <svg
                key={solutionData.title}
                className="connection-string connection-string-right"
                viewBox="0 0 600 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                {rightPaths.map((d, index) => (
                  <path
                    key={index}
                    className={`string string-${index + 1}`}
                    d={d}
                  />
                ))}
              </svg>
            </span>
          </div>
        </div>

        <TitleReveal
          title={solutionData.page.hero?.title}
          description={solutionData.page.hero?.description}
          className="z-2 space-y-4"
        />

        <div className="mt-10 flex items-center gap-3">
          <Link to="/login">
            <Button
              style={{
                backgroundColor: `${solutionData.color.hex}`,
              }}
              size="lg"
              className={'text-white'}
            >
              {solutionData.page.hero?.primaryAction}
            </Button>
          </Link>

          <Button size="lg" variant="outline">
            {solutionData.page.hero?.secondaryAction}
          </Button>
        </div>
      </div>
    </section>
  )
}
