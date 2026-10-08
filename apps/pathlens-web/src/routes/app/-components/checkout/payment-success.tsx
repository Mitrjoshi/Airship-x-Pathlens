import { useRouteContext } from '@tanstack/react-router'
import { useId, type ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/* Timeline (seconds). Edit these and every keyframe follows.          */
/* ------------------------------------------------------------------ */
const FADE_IN = 0.5
const SPIN_START = 0.9 // card hovers first, then starts to turn
const SPIN_D = 2.5
const SPIN_END = SPIN_START + SPIN_D // 3.4
const SHRINK_START = 2.9 // card collapses to a point while still spinning
const POP_AT = SPIN_END - 0.08 // circle bursts out of that same point
const CHECK_AT = POP_AT + 0.3

const TURNS = 6 // full flips before the card vanishes
const POWER = 2.4 // higher = slower start and faster finish
const STEPS = 180 // sampled keyframes for the spin

/* ------------------------------------------------------------------ */
/* Spin curve and lighting, sampled into keyframes                     */
/* ------------------------------------------------------------------ */
const rad = (d: number) => (d * Math.PI) / 180
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v))
const angleAt = (u: number) => 360 * TURNS * Math.pow(u, POWER)

// Light from above and in front. Returns how dark and how glossy the
// currently visible face should look at a given rotateX angle.
function lighting(deg: number) {
  const s = Math.sin(rad(deg))
  const c = Math.cos(rad(deg))
  const side = c >= 0 ? 1 : -1
  const diffuse = side * (0.5 * s + 0.85 * c)
  const half = side * (0.261 * s + 0.965 * c)
  return {
    shade: clamp(0.62 * (1 - diffuse / 0.98), 0, 0.78),
    spec: Math.pow(Math.max(0, half), 48) * 0.6,
  }
}

const sampled = (fn: (deg: number) => string) =>
  Array.from({ length: STEPS + 1 }, (_, i) => {
    const u = i / STEPS
    return `${(u * 100).toFixed(2)}%{${fn(angleAt(u))}}`
  }).join('')

const SPIN_FRAMES = sampled((d) => `transform:rotateX(${d.toFixed(1)}deg)`)
const SHADE_FRAMES = sampled((d) => `opacity:${lighting(d).shade.toFixed(3)}`)
const SPEC_FRAMES = sampled((d) => `opacity:${lighting(d).spec.toFixed(3)}`)

// Hover path for the whole card: rises in, bobs and sways, then gathers to
// the centre and shrinks to a point. Keep the function order identical in
// every pose so the browser can interpolate between them.
const at = (s: number) => `${((s / SPIN_END) * 100).toFixed(2)}%`

const FLOAT = [
  [
    0,
    'translateY(28px) rotateZ(-3deg) rotateY(0deg) scale(.88)',
    'cubic-bezier(.16,1,.3,1)',
  ],
  [
    0.75,
    'translateY(-6px) rotateZ(-1.6deg) rotateY(6deg) scale(1)',
    'ease-in-out',
  ],
  [
    1.35,
    'translateY(5px) rotateZ(1.2deg) rotateY(-5deg) scale(1)',
    'ease-in-out',
  ],
  [
    1.95,
    'translateY(-7px) rotateZ(-.8deg) rotateY(4deg) scale(1)',
    'ease-in-out',
  ],
  [
    2.5,
    'translateY(-3px) rotateZ(.4deg) rotateY(-2deg) scale(1)',
    'ease-in-out',
  ],
  [
    SHRINK_START,
    'translateY(-6px) rotateZ(0deg) rotateY(0deg) scale(1)',
    'cubic-bezier(.6,0,.9,.5)',
  ],
  [
    SPIN_END,
    'translateY(0px) rotateZ(0deg) rotateY(0deg) scale(0.001)',
    'linear',
  ],
] as const

const FLOAT_FRAMES = FLOAT.map(([t, tf, ease], i) => {
  const vis =
    i === 0
      ? 'visibility:visible;'
      : i === FLOAT.length - 1
        ? 'visibility:hidden;'
        : ''
  return `${at(t)}{transform:${tf};animation-timing-function:${ease};${vis}}`
}).join('')

const lit0 = lighting(0)

const CSS = `
.pc-root{container-type:inline-size}

.pc-root .pc-fade{position:absolute;inset:0;opacity:1;animation:pc-in ${FADE_IN}s ease-out both,pc-blur ${SPIN_END}s linear both}
.pc-root .pc-stage{position:absolute;inset:0;perspective:1100px;perspective:240cqw}
.pc-root .pc-float{position:absolute;left:14.583%;top:12.353%;width:70.833%;height:62.941%;transform-style:preserve-3d;will-change:transform;animation:pc-float ${SPIN_END}s linear both}
.pc-root .pc-spin{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform;animation:pc-spin ${SPIN_D}s linear ${SPIN_START}s both}

.pc-root .pc-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.pc-root .pc-front{transform:translateZ(.32cqw)}
.pc-root .pc-back{transform:rotateX(180deg) translateZ(.32cqw)}

.pc-root .pc-core{position:absolute;inset:.4px;border-radius:4.706%/7.477%;background:#8c929b}
.pc-root .pc-core-1{transform:translateZ(.24cqw)}
.pc-root .pc-core-2{transform:translateZ(.08cqw)}
.pc-root .pc-core-3{transform:translateZ(-.08cqw)}
.pc-root .pc-core-4{transform:translateZ(-.24cqw)}

.pc-root .pc-shade{opacity:${lit0.shade.toFixed(3)};animation:pc-shade ${SPIN_D}s linear ${SPIN_START}s both}
.pc-root .pc-spec{opacity:${lit0.spec.toFixed(3)};animation:pc-spec ${SPIN_D}s linear ${SPIN_START}s both}
.pc-root .pc-glint{opacity:0;animation:pc-glint 1.2s ease-in-out .35s both}

.pc-root .pc-halo{opacity:.7;transform-box:fill-box;transform-origin:center;animation:pc-halo 1.1s ease-out ${POP_AT}s both}
.pc-root .pc-ripple{opacity:0;transform-box:fill-box;transform-origin:center;animation:pc-ripple 1s cubic-bezier(.2,.7,.2,1) forwards}
.pc-root .pc-pop{transform:scale(1);transform-box:fill-box;transform-origin:center;animation:pc-pop .75s linear ${POP_AT}s both}
.pc-root .pc-check{stroke-dasharray:1;stroke-dashoffset:0;animation:pc-check .42s cubic-bezier(.65,0,.35,1) ${CHECK_AT}s both}

@keyframes pc-in{from{opacity:0}to{opacity:1}}
@keyframes pc-blur{0%{filter:blur(0px)}${at(1.9)}{filter:blur(0px)}${at(2.7)}{filter:blur(1.4px)}100%{filter:blur(3px)}}
@keyframes pc-float{${FLOAT_FRAMES}}
@keyframes pc-spin{${SPIN_FRAMES}}
@keyframes pc-shade{${SHADE_FRAMES}}
@keyframes pc-spec{${SPEC_FRAMES}}
@keyframes pc-glint{0%{transform:translateX(-160px);opacity:0}20%{opacity:1}100%{transform:translateX(560px);opacity:0}}

@keyframes pc-pop{
  0%{transform:scale(0);animation-timing-function:cubic-bezier(.2,.8,.2,1)}
  55%{transform:scale(1.16);animation-timing-function:ease-in-out}
  78%{transform:scale(.96);animation-timing-function:ease-out}
  100%{transform:scale(1)}
}
@keyframes pc-halo{0%{opacity:0;transform:scale(.4)}50%{opacity:1;transform:scale(1.2)}100%{opacity:.7;transform:scale(1)}}
@keyframes pc-ripple{0%{opacity:.7;transform:scale(.9)}100%{opacity:0;transform:scale(2.7)}}
@keyframes pc-check{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}

@media (prefers-reduced-motion:reduce){
  .pc-root .pc-fade{display:none}
  .pc-root *{animation:none!important}
}
`

export function PaymentSuccess({ className }: { className?: string }) {
  const raw = useId()
  const id = `pc${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`

  return (
    <div
      aria-hidden="true"
      className={`pc-root relative aspect-[480/340] w-full ${className ?? ''}`}
    >
      <style>{CSS}</style>

      {/* card layer: hover, accelerating flip, collapse */}
      <div className="pc-fade">
        <div className="pc-stage">
          <div className="pc-float">
            <div className="pc-spin">
              <div className="pc-core pc-core-1" />
              <div className="pc-core pc-core-2" />
              <div className="pc-core pc-core-3" />
              <div className="pc-core pc-core-4" />

              <div className="pc-face pc-front">
                <svg viewBox="0 0 340 214" fill="none" className="size-full">
                  <CardDefs id={`${id}f`} />
                  <FrontFace id={`${id}f`} />
                </svg>
              </div>

              <div className="pc-face pc-back">
                <svg viewBox="0 0 340 214" fill="none" className="size-full">
                  <CardDefs id={`${id}b`} />
                  <BackFace id={`${id}b`} />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* success layer: pops from the exact point the card collapsed to */}
      <svg
        viewBox="0 0 480 340"
        fill="none"
        className="absolute inset-0 size-full"
      >
        <defs>
          <filter
            id={`${id}-halo-blur`}
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="16" />
          </filter>
          <radialGradient id={`${id}-gloss`} cx="0.35" cy="0.25" r="0.85">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g transform="translate(240 149)">
          <circle
            className="pc-halo fill-primary/30"
            r="78"
            filter={`url(#${id}-halo-blur)`}
          />

          {[0, 0.14].map((d) => (
            <circle
              key={d}
              className="pc-ripple stroke-primary"
              r="50"
              strokeWidth="1.6"
              vectorEffect="non-scaling-stroke"
              style={{ animationDelay: `${POP_AT + d}s` }}
            />
          ))}

          <g className="pc-pop">
            <circle r="50" className="fill-primary" />
            <circle r="50" fill={`url(#${id}-gloss)`} />
            <circle
              r="44"
              className="stroke-primary-foreground/25"
              strokeWidth="1"
            />
            <path
              className="pc-check stroke-primary-foreground"
              d="M-17 1L-6 12L19 -13"
              pathLength={1}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </g>
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Card faces                                                          */
/* ------------------------------------------------------------------ */
function CardDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient
        id={`${id}-metal`}
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
        id={`${id}-glow`}
        gradientUnits="userSpaceOnUse"
        cx="70"
        cy="0"
        r="300"
      >
        <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
      <linearGradient
        id={`${id}-falloff`}
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
        id={`${id}-rim`}
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
        id={`${id}-bevel`}
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
      <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.3" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-spec`} x1="0" y1="0" x2="1" y2="0.45">
        <stop offset="0" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
        <stop offset="0.65" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#fff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`${id}-chip`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f3e6b8" />
        <stop offset="0.45" stopColor="#cdb06a" />
        <stop offset="0.7" stopColor="#e8d69f" />
        <stop offset="1" stopColor="#b99a52" />
      </linearGradient>
      <linearGradient id={`${id}-stripe`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#060607" />
        <stop offset="0.5" stopColor="#17181b" />
        <stop offset="1" stopColor="#060607" />
      </linearGradient>
      <pattern
        id={`${id}-panel`}
        width="5"
        height="5"
        patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)"
      >
        <rect width="2" height="5" fill="#8d939c" opacity="0.2" />
      </pattern>
      <pattern
        id={`${id}-brush`}
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
      <clipPath id={`${id}-card`}>
        <rect width="340" height="214" rx="16" />
      </clipPath>
    </defs>
  )
}

function CardBase({ id }: { id: string }) {
  const u = (n: string) => `url(#${id}-${n})`

  return (
    <>
      <rect width="340" height="214" rx="16" fill={u('metal')} />
      <rect width="340" height="214" rx="16" fill={u('brush')} />
      <rect width="340" height="214" rx="16" fill={u('glow')} />
      <rect width="340" height="214" rx="16" fill={u('falloff')} />
      <rect
        x="0.5"
        y="0.5"
        width="339"
        height="213"
        rx="15.5"
        stroke={u('rim')}
      />
      <rect
        x="1.75"
        y="1.75"
        width="336.5"
        height="210.5"
        rx="14.5"
        stroke={u('bevel')}
        strokeWidth="1.2"
      />
    </>
  )
}

/** Dynamic light: darkens as the face tilts away and flashes when it mirrors the light. */
function CardLight({ id }: { id: string }) {
  return (
    <>
      <rect className="pc-shade" width="340" height="214" rx="16" fill="#000" />
      <rect
        className="pc-spec"
        width="340"
        height="214"
        rx="16"
        fill={`url(#${id}-spec)`}
      />
    </>
  )
}

function FrontFace({ id }: { id: string }) {
  const u = (n: string) => `url(#${id}-${n})`
  const year = new Date().getFullYear()

  return (
    <>
      <CardBase id={id} />

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
          fill={u('chip')}
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
          <UserName />
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
          SINCE {year}
        </text>
      </Etched>

      {/* one soft sweep while the card hovers */}
      <g clipPath={u('card')}>
        <g transform="skewX(-20)">
          <rect
            className="pc-glint"
            x="-150"
            y="-10"
            width="100"
            height="240"
            fill={u('sheen')}
          />
        </g>
      </g>

      <CardLight id={id} />
    </>
  )
}

function BackFace({ id }: { id: string }) {
  const u = (n: string) => `url(#${id}-${n})`

  return (
    <>
      <CardBase id={id} />

      {/* magnetic stripe */}
      <rect y="26" width="340" height="42" fill={u('stripe')} />
      <rect y="26" width="340" height="1" fill="#fff" fillOpacity="0.07" />
      <rect y="67" width="340" height="1" fill="#000" fillOpacity="0.6" />

      {/* signature panel */}
      <rect x="24" y="88" width="214" height="34" rx="3" fill="#cdd0d5" />
      <rect x="24" y="88" width="214" height="34" rx="3" fill={u('panel')} />
      <text
        x="29"
        y="96"
        fontSize="4.6"
        letterSpacing="1.2"
        fill="#5c626b"
        fontFamily={SANS}
      >
        AUTHORIZED SIGNATURE
      </text>
      <path
        d="M36 114c8-17 14-17 17-5 2 8 7 8 11-2 3-7 8-7 10 0 2 5 8 5 13-3 6 4 10 3 15-1 6-5 12-4 18 2"
        stroke="#272b32"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* security code */}
      <rect x="250" y="88" width="62" height="34" rx="3" fill="#f1f2f4" />
      <text
        x="255"
        y="96"
        fontSize="4.6"
        letterSpacing="1.2"
        fill="#5c626b"
        fontFamily={SANS}
      >
        CID
      </text>
      <text
        x="306"
        y="113"
        fontSize="14"
        letterSpacing="3"
        textAnchor="end"
        fill="#1c1e22"
        fontFamily={MONO}
      >
        428
      </text>

      {/* fine print */}
      <g fill="#cfd3d9" fillOpacity="0.28">
        <rect x="24" y="142" width="250" height="2.4" rx="1.2" />
        <rect x="24" y="150" width="232" height="2.4" rx="1.2" />
        <rect x="24" y="158" width="262" height="2.4" rx="1.2" />
        <rect x="24" y="166" width="190" height="2.4" rx="1.2" />
      </g>

      <Etched>
        <text
          x="28"
          y="195"
          fontSize="7"
          letterSpacing="3"
          fontFamily={SANS}
          stroke="none"
        >
          LIFETIME
        </text>
        <text
          x="312"
          y="196"
          fontSize="12"
          fontWeight="600"
          letterSpacing="4.5"
          textAnchor="end"
          fontFamily={SANS}
          stroke="none"
        >
          PATHLENS
        </text>
      </Etched>

      <CardLight id={id} />
    </>
  )
}

function UserName() {
  const { user } = useRouteContext({
    from: '/app',
  })

  return user.name.toUpperCase()
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

// x, y, width, light, opacity: fine horizontal streaks for the brushed finish
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

const SANS =
  "ui-sans-serif, system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
