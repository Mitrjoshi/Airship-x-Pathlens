import { useRouteContext } from '@tanstack/react-router'
import type { CSSProperties, ReactNode } from 'react'

// High-frequency, irregular fracture geometry.
// The main break intentionally changes direction in short segments so it reads
// like a brittle material fracture instead of a clean SVG polyline.
const CRACK_POINTS = [
  [170, 0],
  [169, 7],
  [173, 13],
  [166, 20],
  [171, 28],
  [164, 36],
  [167, 44],
  [176, 51],
  [171, 58],
  [181, 66],
  [177, 73],
  [187, 80],
  [179, 87],
  [184, 94],
  [172, 101],
  [163, 108],
  [167, 116],
  [158, 123],
  [162, 131],
  [174, 138],
  [169, 145],
  [181, 153],
  [175, 160],
  [165, 168],
  [171, 176],
  [166, 184],
  [170, 193],
  [168, 202],
  [173, 214],
] as const

const CRACK = CRACK_POINTS.map(([x, y]) => `${x},${y}`).join(' ')
const CRACK_D = `M${CRACK_POINTS.map(([x, y], i) => `${i === 0 ? '' : 'L'}${x},${y}`).join(' ')}`

// Fracture branches: short, uneven and tapered rather than perfectly geometric.
const BRANCHES = [
  'M176,51 L187,48 L194,40',
  'M181,66 L193,70 L202,68 L210,61',
  'M179,87 L191,91 L198,99',
  'M163,108 L153,112 L145,120 L136,119',
  'M167,116 L157,125 L149,129',
  'M174,138 L187,143 L196,151 L207,151',
  'M169,145 L158,150 L151,158',
  'M175,160 L188,165 L197,173',
  'M166,184 L155,188 L147,196',
  'M170,193 L180,199 L188,207',
] as const

// Very fine tertiary stress fractures. These are deliberately faint.
const MICRO_BRANCHES = [
  'M187,48 L191,43',
  'M193,70 L198,76',
  'M191,91 L196,88',
  'M153,112 L148,107',
  'M157,125 L151,137',
  'M187,143 L191,137',
  'M158,150 L153,145',
  'M188,165 L193,162',
  'M155,188 L149,184',
  'M180,199 L184,194',
] as const

const SANS =
  "ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

// Fine horizontal streaks for brushed metal texture
const STREAKS = [
  [0, 3, 110, 1, 0.22],
  [60, 7, 90, 0, 0.08],
  [20, 11, 140, 1, 0.16],
  [100, 14, 70, 1, 0.24],
  [0, 18, 60, 0, 0.09],
  [40, 22, 120, 1, 0.18],
  [130, 26, 50, 0, 0.08],
  [10, 30, 90, 1, 0.2],
  [80, 34, 100, 0, 0.07],
  [0, 38, 80, 1, 0.15],
  [110, 41, 70, 1, 0.22],
  [30, 45, 130, 0, 0.08],
  [140, 5, 40, 0, 0.07],
  [0, 13, 30, 0, 0.07],
  [150, 20, 30, 1, 0.2],
  [70, 28, 60, 1, 0.14],
  [120, 36, 55, 0, 0.07],
  [0, 24, 25, 1, 0.17],
] as const

// Dynamic micro-shards radiating from impact points
const SHARDS = [
  {
    points: '233,254 247,249 241,266',
    origin: '240px 256px',
    dx: -14,
    dy: 38,
    r: -45,
  },
  {
    points: '246,258 256,257 251,268',
    origin: '251px 261px',
    dx: 16,
    dy: 32,
    r: 60,
  },
  {
    points: '226,262 232,259 231,268',
    origin: '230px 263px',
    dx: -28,
    dy: 28,
    r: -85,
  },
  {
    points: '238,240 242,236 244,244',
    origin: '241px 240px',
    dx: 8,
    dy: 45,
    r: 120,
  },
  {
    points: '222,248 226,244 225,251',
    origin: '224px 248px',
    dx: -18,
    dy: 42,
    r: -110,
  },
]

const CSS = `
.bc-root .bc-whole{opacity:0;transform-box:view-box;transform-origin:240px 149px;animation:bc-whole 3.4s linear both}
.bc-root .bc-left{transform-box:view-box;transform-origin:160px 150px;transform:translate(-26px,22px) rotate(-8deg);animation:bc-left 3.4s linear both}
.bc-root .bc-right{transform-box:view-box;transform-origin:320px 150px;transform:translate(24px,26px) rotate(7deg);animation:bc-right 3.4s linear both}
.bc-root .bc-glint{animation:bc-glint 3.4s ease-in-out both}
.bc-root .bc-crack{stroke-dasharray:1;stroke-dashoffset:0;animation:bc-crack 3.4s cubic-bezier(.2,.8,.2,1) both}
.bc-root .bc-shard{transform-box:view-box;transform:translate(var(--dx),var(--dy)) rotate(var(--r));animation:bc-shard 3.4s linear both}

@keyframes bc-whole{
  0%{opacity:0;transform:translateY(-18px);animation-timing-function:cubic-bezier(.16,1,.3,1)}
  12%{opacity:1;transform:translateY(0)}
  22%{transform:translate(0,0)}
  24%{transform:translate(-1.6px,0) rotate(-.4deg)}
  26%{transform:translate(1.6px,0) rotate(.4deg)}
  28%{transform:translate(-1.2px,0) rotate(-.2deg)}
  29.9%{opacity:1;transform:translate(0,0)}
  30%,100%{opacity:0}
}
@keyframes bc-left{
  0%,29.9%{opacity:0;transform:translate(0,0)}
  30%{opacity:1;transform:translate(0,0);animation-timing-function:cubic-bezier(.1,.7,.3,1)}
  38%{transform:translate(-12px,-12px) rotate(-3deg);animation-timing-function:cubic-bezier(.5,0,.9,.6)}
  58%{transform:translate(-30px,32px) rotate(-11deg);animation-timing-function:cubic-bezier(.2,.7,.3,1)}
  68%{transform:translate(-26px,20px) rotate(-7deg)}
  80%,100%{opacity:1;transform:translate(-26px,22px) rotate(-8deg)}
}
@keyframes bc-right{
  0%,29.9%{opacity:0;transform:translate(0,0)}
  30%{opacity:1;transform:translate(0,0);animation-timing-function:cubic-bezier(.1,.7,.3,1)}
  38%{transform:translate(12px,-8px) rotate(3deg);animation-timing-function:cubic-bezier(.5,0,.9,.6)}
  60%{transform:translate(30px,34px) rotate(10deg);animation-timing-function:cubic-bezier(.2,.7,.3,1)}
  70%{transform:translate(25px,24px) rotate(6deg)}
  82%,100%{opacity:1;transform:translate(24px,26px) rotate(7deg)}
}
@keyframes bc-shard{
  0%,29.9%{opacity:0;transform:translate(0,0) rotate(0)}
  30%{opacity:1;transform:translate(0,0) rotate(0);animation-timing-function:cubic-bezier(.4,0,.9,.6)}
  62%,100%{opacity:1;transform:translate(var(--dx),var(--dy)) rotate(var(--r))}
}
@keyframes bc-glint{
  0%,8%{transform:translateX(0)}
  24%,100%{transform:translateX(560px)}
}
@keyframes bc-crack{
  0%,20%{stroke-dashoffset:1}
  27%,100%{stroke-dashoffset:0}
}
@media (prefers-reduced-motion:reduce){.bc-root *{animation:none!important}}
`

export function BrokenCard({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 340"
      fill="none"
      aria-hidden="true"
      className={`bc-root h-auto w-full ${className ?? ''}`}
    >
      <style>{CSS}</style>

      <defs>
        <filter
          id="bc-fracture"
          x="-20%"
          y="-5%"
          width="140%"
          height="110%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.045 0.22"
            numOctaves="2"
            seed="17"
            result="noise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1.15"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
        <linearGradient
          id="bc-metal"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="340"
          y2="214"
        >
          <stop offset="0" stopColor="#1a1c1e" />
          <stop offset="0.22" stopColor="#111214" />
          <stop offset="0.42" stopColor="#1a1c1e" />
          <stop offset="0.6" stopColor="#08090a" />
          <stop offset="0.8" stopColor="#111214" />
          <stop offset="1" stopColor="#08090a" />
        </linearGradient>
        <radialGradient
          id="bc-glow"
          gradientUnits="userSpaceOnUse"
          cx="70"
          cy="0"
          r="300"
        >
          <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <linearGradient
          id="bc-shade"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2="214"
        >
          <stop offset="0.55" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient
          id="bc-rim"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2="214"
        >
          <stop offset="0" stopColor="#3b3f46" />
          <stop offset="1" stopColor="#1a1c1e" />
        </linearGradient>
        <linearGradient
          id="bc-bevel"
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2="214"
        >
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="bc-sheen" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="bc-chip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3e6b8" />
          <stop offset="0.45" stopColor="#cdb06a" />
          <stop offset="0.7" stopColor="#e8d69f" />
          <stop offset="1" stopColor="#b99a52" />
        </linearGradient>

        <pattern
          id="bc-brush"
          width="180"
          height="48"
          patternUnits="userSpaceOnUse"
        >
          {STREAKS.map(([x, y, w, light, o], i) => (
            <rect
              key={i}
              x={x}
              y={y}
              width={w}
              height="0.7"
              fill={light ? '#000' : '#fff'}
              opacity={o * 1.5}
            />
          ))}
        </pattern>

        <clipPath id="bc-card">
          <rect width="340" height="214" rx="16" />
        </clipPath>
        <clipPath id="bc-clip-left">
          <polygon points={`0,0 ${CRACK} 0,214`} />
        </clipPath>
        <clipPath id="bc-clip-right">
          <polygon points={`340,0 ${CRACK} 340,214`} />
        </clipPath>
      </defs>

      {/* Intact card state */}
      <g className="bc-whole">
        <g transform="translate(70 42)">
          <CardFace />

          <g clipPath="url(#bc-card)">
            <g transform="skewX(-20)">
              <rect
                className="bc-glint"
                x="-150"
                y="-10"
                width="100"
                height="240"
                fill="url(#bc-sheen)"
              />
            </g>
          </g>

          {/* Layered fracture: deep cavity -> dark core -> fractured highlight. */}
          <g
            filter="url(#bc-fracture)"
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="round"
          >
            {/* Broad cavity shadow creates real depth instead of a drawn line. */}
            <path
              className="bc-crack"
              d={CRACK_D}
              pathLength={1}
              stroke="#000"
              strokeWidth="5.5"
              opacity="0.72"
            />

            {/* Main dark fracture core. */}
            <path
              className="bc-crack"
              d={CRACK_D}
              pathLength={1}
              stroke="#020304"
              strokeWidth="2.35"
            />

            {/* One fracture wall catches light; it is intentionally offset. */}
            <path
              className="bc-crack"
              d={CRACK_D}
              pathLength={1}
              transform="translate(-1.05 -0.65)"
              stroke="#ffffff"
              strokeWidth="0.65"
              opacity="0.72"
            />

            {/* Dark inner lip prevents the highlight from looking like a white drawing. */}
            <path
              className="bc-crack"
              d={CRACK_D}
              pathLength={1}
              transform="translate(0.7 0.5)"
              stroke="#111214"
              strokeWidth="0.9"
              opacity="0.95"
            />

            {/* Secondary fracture network. */}
            {BRANCHES.map((d, i) => (
              <path
                key={`branch-${i}`}
                className="bc-crack"
                d={d}
                pathLength={1}
                stroke={i % 3 === 0 ? '#050607' : '#0d0f12'}
                strokeWidth={i % 3 === 0 ? '1.35' : '0.9'}
                opacity={0.82 - (i % 3) * 0.12}
              />
            ))}

            {/* Hairline tertiary fractures. */}
            {MICRO_BRANCHES.map((d, i) => (
              <path
                key={`micro-${i}`}
                className="bc-crack"
                d={d}
                pathLength={1}
                stroke="#dfe3e8"
                strokeWidth="0.42"
                opacity="0.28"
              />
            ))}
          </g>
        </g>
      </g>

      {/* Left split piece */}
      <g className="bc-left">
        <g transform="translate(70 42)">
          <g clipPath="url(#bc-clip-left)">
            <CardFace />
            <CutEdge side="left" />
          </g>
        </g>
      </g>

      {/* Right split piece */}
      <g className="bc-right">
        <g transform="translate(70 42)">
          <g clipPath="url(#bc-clip-right)">
            <CardFace />
            <CutEdge side="right" />
          </g>
        </g>
      </g>

      {/* Flying micro-shards */}
      {SHARDS.map((s) => (
        <polygon
          key={s.points}
          className="bc-shard"
          points={s.points}
          fill="#25282e"
          stroke="#e0e3e8"
          strokeWidth="0.5"
          strokeLinejoin="miter"
          style={
            {
              '--dx': `${s.dx}px`,
              '--dy': `${s.dy}px`,
              '--r': `${s.r}deg`,
              transformOrigin: s.origin,
            } as CSSProperties
          }
        />
      ))}
    </svg>
  )
}

/** Detailed multi-layered broken plastic edge geometry */
function CutEdge({ side }: { side: 'left' | 'right' }) {
  const isLeft = side === 'left'
  const offset = isLeft ? -0.8 : 0.8

  return (
    <g strokeLinejoin="miter" strokeLinecap="round">
      {/* Deep cavity. The slightly wider stroke is what makes the break read as depth. */}
      <polyline points={CRACK} stroke="#000" strokeWidth="6" opacity="0.88" />

      {/* Uneven dark wall of the broken material. */}
      <polyline
        points={CRACK}
        stroke="#070809"
        strokeWidth="3.6"
        opacity="0.98"
        transform={`translate(${isLeft ? 0.7 : -0.7} 0)`}
      />

      {/* Rough exposed material. */}
      <polyline
        points={CRACK}
        stroke="#25282d"
        strokeWidth="2.1"
        opacity="0.96"
        transform={`translate(${isLeft ? -0.15 : 0.15} 0.15)`}
      />

      {/* Thin bright fracture wall, offset so it behaves like a bevel catching light. */}
      <polyline
        points={CRACK}
        stroke="#bfc5cc"
        strokeWidth="0.95"
        transform={`translate(${offset} -0.45)`}
        opacity="0.82"
      />

      <polyline
        points={CRACK}
        stroke="#ffffff"
        strokeWidth="0.35"
        transform={`translate(${offset * 1.65} -0.8)`}
        opacity="0.88"
      />

      {/* Tiny exposed fracture branches along the broken edge. */}
      {BRANCHES.map((d, i) => (
        <path
          key={`edge-branch-${i}`}
          d={d}
          fill="none"
          stroke={i % 2 ? '#17191d' : '#c6cbd1'}
          strokeWidth={i % 2 ? '0.8' : '0.45'}
          opacity={i % 2 ? '0.82' : '0.55'}
          transform={`translate(${isLeft ? -0.4 : 0.4} 0)`}
        />
      ))}
    </g>
  )
}

function Etched({ children }: { children: ReactNode }) {
  return (
    <>
      <g transform="translate(0 0.8)" fill="#000" stroke="#000" opacity="0.4">
        {children}
      </g>
      <g fill="#cfd3d9" stroke="#cfd3d9">
        {children}
      </g>
    </>
  )
}

export function CardFace() {
  const { user } = useRouteContext({
    from: '/app',
  })

  return (
    <>
      <rect width="340" height="214" rx="16" fill="url(#bc-metal)" />
      <rect width="340" height="214" rx="16" fill="url(#bc-brush)" />
      <rect width="340" height="214" rx="16" fill="url(#bc-glow)" />
      <rect width="340" height="214" rx="16" fill="url(#bc-shade)" />

      <rect
        x="0.5"
        y="0.5"
        width="339"
        height="213"
        rx="15.5"
        stroke="url(#bc-rim)"
      />
      <rect
        x="1.75"
        y="1.75"
        width="336.5"
        height="210.5"
        rx="14.5"
        stroke="url(#bc-bevel)"
        strokeWidth="1.2"
      />

      <Etched>
        <text
          x="28"
          y="46"
          fontSize="15"
          fontWeight="600"
          letterSpacing="4.5"
          fontFamily={SANS}
          stroke="none"
        >
          PATHLENS
        </text>
        <text
          x="312"
          y="44"
          fontSize="10"
          letterSpacing="4"
          textAnchor="end"
          fontFamily={SANS}
          stroke="none"
        >
          LIFETIME
        </text>
      </Etched>

      <g transform="translate(28 78)">
        <rect
          width="48"
          height="36"
          rx="6"
          fill="url(#bc-chip)"
          stroke="#8a7338"
          strokeWidth="0.8"
        />
        <g stroke="#8a7338" strokeWidth="0.8" opacity="0.8">
          <path d="M16 0v10M32 0v10M16 36V26M32 36V26M0 12h16M0 24h16M32 12h16M32 24h16" />
          <rect x="16" y="10" width="16" height="16" rx="3" />
        </g>
      </g>

      <g transform="translate(96 96)">
        <Etched>
          {[0, 1, 2, 3].map((i) => (
            <path
              key={i}
              d={`M${i * 5.5} ${-4 - i * 2.2} Q ${i * 5.5 + 4 + i * 1.5} 0 ${i * 5.5} ${4 + i * 2.2}`}
              fill="none"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          ))}
        </Etched>
      </g>

      <Etched>
        <text
          x="28"
          y="158"
          fontSize="19"
          letterSpacing="2.2"
          fontFamily={MONO}
          stroke="none"
        >
          3782 822463 10005
        </text>
        <text
          x="28"
          y="190"
          fontSize="9.5"
          letterSpacing="2.6"
          fontFamily={SANS}
          stroke="none"
        >
          {user.name.toUpperCase()}
        </text>
        <text
          x="312"
          y="190"
          fontSize="9.5"
          letterSpacing="2.6"
          textAnchor="end"
          fontFamily={SANS}
          stroke="none"
        >
          SINCE {new Date().getFullYear()}
        </text>
      </Etched>
    </>
  )
}
