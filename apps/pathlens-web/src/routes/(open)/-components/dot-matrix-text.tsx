import { useId, useMemo, type CSSProperties } from 'react'

interface DotMatrixTextProps {
  value: string
  className?: string
  dotSize?: number
  gap?: number
}

const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01111', '10000', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],

  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],

  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '00100', '00100', '01000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '%': ['11001', '11010', '00100', '00100', '01011', '10011', '00000'],
  '/': ['00001', '00001', '00010', '00100', '01000', '10000', '10000'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
}

function noise(x: number, y: number, seed = 0) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453
  return value - Math.floor(value)
}

function pickColor(value: number, palette: string[]) {
  const index = Math.min(palette.length - 1, Math.floor(value * palette.length))
  return palette[index]
}

interface MatrixDot {
  x: number
  y: number
  active: boolean
  opacity: number
  color: string
  glowColor: string
  duration: number
  delay: number
}

export function DotMatrixText({
  value,
  className,
  dotSize = 8,
  gap = 3,
}: DotMatrixTextProps) {
  const id = useId().replace(/:/g, '')
  const pitch = dotSize + gap

  const characters = useMemo(
    () =>
      [...value.toUpperCase()].map((character) => FONT[character] ?? FONT[' ']),
    [value]
  )

  const characterSpacing = 1
  const paddingX = 10
  const paddingY = 8

  const contentColumns =
    characters.length * 5 +
    Math.max(0, characters.length - 1) * characterSpacing

  const columns = Math.max(35, contentColumns + paddingX * 2)
  const rows = Math.max(23, 7 + paddingY * 2)

  const width = columns * pitch
  const height = rows * pitch

  const textStartX = Math.floor((columns - contentColumns) / 2)
  const textStartY = Math.floor((rows - 7) / 2)

  const activeDots = useMemo(() => {
    const dots = new Set<string>()

    characters.forEach((character, index) => {
      const charX = textStartX + index * (5 + characterSpacing)

      character.forEach((line, row) => {
        ;[...line].forEach((pixel, col) => {
          if (pixel === '1') {
            dots.add(`${charX + col},${textStartY + row}`)
          }
        })
      })
    })

    return dots
  }, [characters, textStartX, textStartY])

  const dots = useMemo(() => {
    const result: MatrixDot[] = []

    const inactivePalette = [
      'var(--matrix-bg-1)',
      'var(--matrix-bg-2)',
      'var(--matrix-bg-3)',
      'var(--matrix-bg-4)',
      'var(--matrix-bg-5)',
      'var(--matrix-bg-6)',
    ]

    const inactiveAccentPalette = [
      'var(--matrix-accent-1)',
      'var(--matrix-accent-2)',
      'var(--matrix-accent-3)',
      'var(--matrix-accent-4)',
    ]

    const activePalette = [
      'var(--matrix-active-1)',
      'var(--matrix-active-2)',
      'var(--matrix-active-3)',
      'var(--matrix-active-4)',
      'var(--matrix-active-5)',
      'var(--matrix-active-6)',
    ]

    const activeGlowPalette = [
      'var(--matrix-active-1)',
      'var(--matrix-active-2)',
      'var(--matrix-active-3)',
      'var(--matrix-active-4)',
    ]

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const active = activeDots.has(`${col},${row}`)

        const random = noise(col, row)
        const variation = noise(col, row, 11)
        const timing = noise(col, row, 23)
        const offset = noise(col, row, 37)
        const shimmer = noise(col, row, 53)

        let color = '#10201b'
        let glowColor = '#52dca5'
        let opacity = 0.08 + random * 0.1

        if (active) {
          color = pickColor(variation, activePalette)
          glowColor = pickColor(shimmer, activeGlowPalette)
          opacity = 0.88 + noise(col, row, 71) * 0.12
        } else {
          const useAccent = variation > 0.82
          color = useAccent
            ? pickColor(shimmer, inactiveAccentPalette)
            : pickColor(random, inactivePalette)

          opacity = useAccent
            ? 0.18 + noise(col, row, 89) * 0.12
            : 0.07 + noise(col, row, 97) * 0.1
        }

        result.push({
          x: col * pitch,
          y: row * pitch,
          active,
          opacity,
          color,
          glowColor,
          duration: 7 + timing * 7,
          delay: -(offset * 14),
        })
      }
    }

    return result
  }, [activeDots, columns, rows, pitch])

  const inactiveDots = useMemo(() => dots.filter((dot) => !dot.active), [dots])
  const illuminatedDots = useMemo(
    () => dots.filter((dot) => dot.active),
    [dots]
  )

  const radius = Math.min(2.5, dotSize / 3)

  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label={value}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id={`${id}-fade`}>
          <stop offset="0%" stopColor="white" />
          <stop offset="80%" stopColor="white" stopOpacity={1} />
          <stop offset="99%" stopColor="white" stopOpacity={1} />
          <stop offset="100%" stopColor="white" stopOpacity={1} />
        </radialGradient>

        <mask
          id={`${id}-mask`}
          maskUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={width}
          height={height}
        >
          <rect width={width} height={height} fill={`url(#${id}-fade)`} />
        </mask>

        <filter id={`${id}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      {/* Background matrix */}
      <g mask={`url(#${id}-mask)`}>
        {inactiveDots.map((dot, index) => (
          <rect
            key={`background-${index}`}
            x={dot.x}
            y={dot.y}
            width={dotSize}
            height={dotSize}
            rx={radius}
            fill={dot.color}
            opacity={dot.opacity}
          />
        ))}
      </g>

      {/* Glow behind active dots */}
      <g filter={`url(#${id}-glow)`} opacity={0.22} aria-hidden="true">
        {illuminatedDots.map((dot, index) => (
          <rect
            key={`glow-${index}`}
            x={dot.x}
            y={dot.y}
            width={dotSize}
            height={dotSize}
            rx={radius}
            fill={dot.glowColor}
          />
        ))}
      </g>

      {/* Active character dots */}
      <g>
        {illuminatedDots.map((dot, index) => (
          <rect
            key={`character-${index}`}
            className="dot-matrix-active"
            x={dot.x}
            y={dot.y}
            width={dotSize}
            height={dotSize}
            rx={radius}
            fill={dot.color}
            style={
              {
                '--dot-opacity': dot.opacity,
                animationDuration: `${dot.duration}s`,
                animationDelay: `${dot.delay}s`,
              } as CSSProperties
            }
          />
        ))}
      </g>
    </svg>
  )
}
