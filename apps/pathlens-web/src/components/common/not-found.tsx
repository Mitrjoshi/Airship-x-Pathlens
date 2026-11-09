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

type Pt = readonly [number, number]

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

/* ---------- Cat sprite (faces left, 16 x 15 pixels) ---------- */

const CAT_WIDTH = 0.75 // in grid cells
const S = CAT_WIDTH / 16

/* ---------- Walk loops (grid vertices) ----------
   Each loop is ordered so the surface is on the cat's feet side:
   outer edges counter-clockwise, the hollow of the 0 clockwise. */

const OUTER_4: Pt[] = [
  [4, 1],
  [3, 1],
  [3, 2],
  [2, 2],
  [2, 3],
  [1, 3],
  [1, 4],
  [0, 4],
  [0, 6],
  [4, 6],
  [4, 8],
  [5, 8],
  [5, 6],
  [6, 6],
  [6, 5],
  [5, 5],
  [5, 0],
  [4, 0],
]
const HOLLOW_0: Pt[] = [
  [1, 1],
  [4, 1],
  [4, 7],
  [1, 7],
]

const prepare = (pts: Pt[], dx: number) => {
  const v = pts.map(([x, y]) => [x + dx, y] as Pt)
  const lens = v.map((a, i) => {
    const b = v[(i + 1) % v.length]
    return Math.hypot(b[0] - a[0], b[1] - a[1])
  })
  const total = lens.reduce((a, b) => a + b, 0)
  const starts = lens.map((_, i) => lens.slice(0, i).reduce((a, b) => a + b, 0))
  return { v, lens, total, starts }
}

type Loop = ReturnType<typeof prepare>

const place = (loop: Loop, dist: number) => {
  let d = ((dist % loop.total) + loop.total) % loop.total
  let i = 0
  while (i < loop.lens.length - 1 && d > loop.lens[i]) {
    d -= loop.lens[i]
    i++
  }
  const a = loop.v[i]
  const b = loop.v[(i + 1) % loop.v.length]
  const t = d / loop.lens[i]
  const dirX = (b[0] - a[0]) / loop.lens[i]
  const dirY = (b[1] - a[1]) / loop.lens[i]
  const x = a[0] + (b[0] - a[0]) * t
  const y = a[1] + (b[1] - a[1]) * t
  const angle = (Math.atan2(dirY, dirX) * 180) / Math.PI - 180
  return `translate(${x} ${y}) rotate(${angle}) translate(${-8 * S} ${-15 * S})`
}

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
