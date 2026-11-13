import { DotLayout } from '@/routes/(open)/-components/dot-layout'
import { Footer } from '@/routes/(open)/-components/footer'
import { Header } from '@/routes/(open)/-components/header'
import { HomeLayout } from '@/routes/(open)/-components/home-layout'
import { Link } from '@tanstack/react-router'
import { Button } from '@workspace/ui/components/button'

export const NotFound = () => {
  return (
    <>
      <Header />

      <HomeLayout>
        <DotLayout className="border-x-2 border-dashed">
          <NotFoundHero />
        </DotLayout>
      </HomeLayout>

      <Footer />
    </>
  )
}

/* ---------- Glyphs (1 char = 1 block) ---------- */

const GLYPH_4 = [
  '....#.',
  '...##.',
  '..#.#.',
  '.#..#.',
  '#...#.',
  '######',
  '....#.',
  '....#.',
]

const GLYPH_0 = [
  '.###.',
  '#...#',
  '#...#',
  '#...#',
  '#...#',
  '#...#',
  '#...#',
  '.###.',
]

const toBlocks = (glyph: string[], dx: number) =>
  glyph.flatMap((row, y) =>
    [...row].flatMap((ch, x) => (ch === '#' ? [{ x: x + dx, y }] : []))
  )

const BLOCKS = [
  ...toBlocks(GLYPH_4, 0),
  ...toBlocks(GLYPH_0, 7),
  ...toBlocks(GLYPH_4, 13),
]

const CSS = `
@keyframes nf-pop { 0% { opacity: 0 } 35% { opacity: .3 } 100% { opacity: 1 } }
@keyframes nf-fade { from { opacity: 0 } to { opacity: 1 } }
.nf-block { animation: nf-pop 320ms steps(4, end) both }
.nf-cat { animation: nf-fade 400ms ease-out 1.4s both }
.nf-fade { animation: nf-fade 600ms ease-out .9s both }
@media (prefers-reduced-motion: reduce) {
  .nf-block, .nf-cat, .nf-fade { animation: none }
}
`

export const NotFoundHero = () => {
  return (
    <div className="bg-background mx-auto flex min-h-[calc(100dvh-56px)] max-w-[75%] flex-col items-center justify-center space-y-10 border-x-2 border-dashed px-4 py-12">
      <style>{CSS}</style>

      <svg
        viewBox="-1 -1 21 10"
        role="img"
        aria-label="404"
        className="w-[min(88%,56rem)] overflow-visible"
      >
        <g fill="currentColor" shapeRendering="crispEdges">
          {BLOCKS.map((b, i) => (
            <rect
              key={`${b.x}-${b.y}`}
              x={b.x}
              y={b.y}
              width={1}
              height={1}
              className="nf-block"
              style={{ animationDelay: `${((i * 37) % 19) * 45}ms` }}
            />
          ))}
        </g>
      </svg>

      <div className="flex w-full flex-col items-center gap-6">
        <p className="max-w-[40ch] text-center">
          We can't find the page you were looking for. It may have been moved,
          renamed, or no longer exists.
        </p>

        <div className="flex items-center justify-center gap-2">
          <Link to="/">
            <Button className="h-12 rounded-full border px-6">
              Take me Home
            </Button>
          </Link>
          <Link to="/products">
            <Button variant={'outline'} className="h-12 rounded-full px-6">
              View all Products
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
