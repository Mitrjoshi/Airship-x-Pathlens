import { useId } from 'react'

const LOGO_PATH =
  'M157.76 136.87C154.64 131.51 154.06 118.96 153.67 112.66C153.13 103.94 153.66 95.43 155.57 86.92C162.34 56.75 190.26 40.8 218.53 35.29C236.08 31.87 257.72 35.39 275.24 38.16C327.28 46.38 385.04 70.87 424.7 106.12C445.27 124.41 470.27 158.27 464.67 187.36C457.66 223.76 415.31 238.55 382.42 238.94C377.31 239 361.98 240.15 357.89 238.62C355.89 237.86 356.29 234.3 356.15 232.65C355.77 228.18 353.97 222.57 352.04 218.52C344.88 203.56 334.98 190.64 322.61 179.44C290.02 149.93 243.38 131.25 199.32 130.79C192.03 130.72 183.85 130.6 176.72 132.21C172.43 133.17 161.17 136.83 157.76 136.87ZM305.94 249.19C308.98 249.19 312.02 249.19 315.07 249.19C321.98 249.55 328.93 249.2 335.84 249.45C370.48 250.68 410.85 250.99 439.85 229.11C446.57 224.04 452.48 218.37 457.42 211.53C459.54 208.6 460.71 203.99 463.24 201.6C463.82 206.09 461.49 212.37 460.22 216.67C457.1 227.22 454.23 237.44 450.25 247.74C433.48 291.13 394.58 336.88 347.89 348.59C331.66 352.67 315.12 353.34 298.4 353.88C289.27 354.18 277.24 353.65 269.3 359.05C257.22 367.27 258.3 381.12 257.71 394.29C257.22 405.22 255.95 415.87 252.45 426.21C239.55 464.33 193.98 471.43 159.62 461.56C150.64 458.98 142.27 454.72 134.4 449.86C98.09 427.45 83.69 382.74 71.02 344.7C66.4 330.84 60.79 317.21 56.29 303.35C36.95 243.68 22.09 180.01 52.39 121.11C58.75 108.74 68.38 97 78.46 87.38C81.75 84.23 85.56 81.65 88.87 78.6C101.81 66.69 119.55 57.71 135.98 51.75C149.93 46.69 162.54 43.32 176.96 39.83C183.91 38.15 192.44 35.62 199.67 36.3C195.37 39.26 188.86 40.11 183.98 42.23C172.25 47.31 160.2 56.28 153.33 67.25C136.23 94.58 140.58 126.1 146.8 156.16C150.09 172.04 155.28 187.42 160.56 202.64C167.84 223.65 175.26 244.68 183.02 265.56C187.96 278.86 193.8 292.15 197.67 305.73C204.16 328.49 211.66 350.65 216.68 373.91C218.24 381.15 219.44 388.72 219.81 396.12C220.01 400.13 218.98 405.64 220.38 409.36C225.45 408.7 230.62 396.71 232.38 392.46C239.72 374.76 236.05 347.3 234.26 328.54C232.9 314.29 230.22 300 231.97 285.62C236.22 250.73 279.4 250.54 305.94 249.19Z'

type AnimatedLogoProps = {
  size?: number
  className?: string
}

export const AnimatedLogo = ({ size = 500, className }: AnimatedLogoProps) => {
  const id = useId().replace(/:/g, '')

  const fillId = `${id}-logo-fill`
  const strokeId = `${id}-logo-stroke`

  const ticks = Array.from({ length: 19 }, (_, index) => {
    const position = 70 + index * 20
    const length = index % 5 === 0 ? 12 : 5

    return { position, length }
  })

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 500 500"
      width={size}
      height={size}
      fill="none"
      role="img"
      aria-label="Animated Pathlens logo construction"
      className={className}
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--logo-fill-start)" />
          <stop offset="50%" stopColor="var(--logo-fill-mid)" />
          <stop offset="100%" stopColor="var(--logo-fill-end)" />
        </linearGradient>

        <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--logo-stroke-start)" />
          <stop offset="50%" stopColor="var(--logo-stroke-mid)" />
          <stop offset="100%" stopColor="var(--logo-stroke-end)" />
        </linearGradient>
      </defs>

      {/* Transparent technical construction board */}
      <g
        aria-hidden="true"
        className="pl-board"
        fill="none"
        stroke="var(--logo-stroke-mid, #a3a3a3)"
        strokeWidth="1.35"
      >
        {/* Main square frame */}
        <rect
          x="44"
          y="44"
          width="412"
          height="412"
          className="pl-board-frame"
        />

        {/* Inner corner segments */}
        <path
          d="
            M62 100 V62 H100
            M400 62 H438 V100
            M62 400 V438 H100
            M400 438 H438 V400
          "
          className="pl-board-lines"
        />

        {/* External registration marks */}
        <path
          d="
            M24 44 H64 M44 24 V64
            M436 44 H476 M456 24 V64
            M24 456 H64 M44 436 V476
            M436 456 H476 M456 436 V476
          "
          className="pl-board-lines"
        />

        {/* Top and bottom measurement ticks */}
        <g className="pl-board-details">
          {ticks.map(({ position, length }) => (
            <g key={position}>
              <path d={`M${position} 44 V${44 + length}`} />
              <path d={`M${position} 456 V${456 - length}`} />
            </g>
          ))}

          {/* Side measurement ticks */}
          {ticks.map(({ position, length }) => (
            <g key={`side-${position}`}>
              <path d={`M44 ${position} H${44 + length}`} />
              <path d={`M456 ${position} H${456 - length}`} />
            </g>
          ))}
        </g>

        {/* Circular stencil arcs around the logo */}
        <circle
          cx="250"
          cy="250"
          r="193"
          strokeDasharray="3 8"
          className="pl-board-circle"
        />

        <path d="M92 139 A193 193 0 0 1 407 138" className="pl-board-arc" />

        <path
          d="M407 362 A193 193 0 0 1 92 361"
          className="pl-board-arc pl-delay"
        />

        <path d="M139 92 A193 193 0 0 0 92 139" className="pl-board-arc" />

        <path
          d="M361 408 A193 193 0 0 0 408 361"
          className="pl-board-arc pl-delay"
        />

        {/* Circular registration details */}
        <g className="pl-board-details">
          <circle cx="250" cy="57" r="5" />
          <circle cx="443" cy="250" r="5" />
          <circle cx="250" cy="443" r="5" />
          <circle cx="57" cy="250" r="5" />

          <circle cx="250" cy="57" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="443" cy="250" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="250" cy="443" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="57" cy="250" r="1.7" fill="currentColor" stroke="none" />
        </g>

        {/* Alignment markers */}
        <path
          d="
            M250 20 V35
            M250 465 V480
            M20 250 H35
            M465 250 H480
          "
          strokeWidth="1.8"
          className="pl-board-details"
        />

        {/* Small technical labels */}
        <g
          fill="var(--logo-stroke-mid, #a3a3a3)"
          stroke="none"
          fontSize="7"
          fontFamily="monospace"
          letterSpacing="1"
          className="pl-board-details"
        >
          <text x="69" y="77">
            PL / 01
          </text>
          <text x="431" y="77" textAnchor="end">
            500
          </text>
          <text x="69" y="427">
            VECTOR
          </text>
          <text x="431" y="427" textAnchor="end">
            1:1
          </text>
        </g>
      </g>

      {/* Logo centered within the construction board */}
      <g transform="translate(82.5 82.5) scale(0.67)">
        <g className="pl-logo-zoom">
          <path
            d={LOGO_PATH}
            fill={`url(#${fillId})`}
            className="pl-logo-fill"
          />

          <path
            d={LOGO_PATH}
            pathLength={1000}
            fill="none"
            stroke={`url(#${strokeId})`}
            strokeWidth={4}
            strokeLinejoin="round"
            strokeLinecap="round"
            className="pl-logo-outline"
          />
        </g>
      </g>

      <style>
        {`
          .pl-board {
            opacity: 0;
            color: var(--logo-stroke-mid, #a3a3a3);
            animation: pl-board-reveal 1.7s ease-out forwards;
          }

          .pl-board-frame {
            stroke-width: 1.45;
            opacity: 0.95;
            stroke-dasharray: 1648;
            stroke-dashoffset: 1648;
            animation: pl-board-draw 1.4s ease-in-out forwards;
          }

          .pl-board-lines {
            opacity: 0;
            stroke-width: 1.4;
            animation: pl-details-show-strong 0.7s ease-out 0.2s forwards;
          }

          .pl-board-circle {
            opacity: 0;
            stroke-width: 1.25;
            animation: pl-details-show-medium 0.8s ease-out 0.3s forwards;
          }

          .pl-board-arc {
            stroke-width: 1.55;
            opacity: 0.92;
            stroke-dasharray: 650;
            stroke-dashoffset: 650;
            animation: pl-arc-draw 1.3s ease-out 0.2s forwards;
          }

          .pl-board-details {
            opacity: 0;
            animation: pl-details-show-strong 0.8s ease-out 0.45s forwards;
          }

          .pl-delay {
            animation-delay: 0.35s;
          }

          .pl-logo-zoom {
            transform-box: view-box;
            transform-origin: center;
            animation: pl-logo-scale 1.5s cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .pl-logo-outline {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
            animation: pl-logo-draw 1.2s cubic-bezier(0.45, 0, 0.2, 1) 0.15s forwards;
          }

          .pl-logo-fill {
            opacity: 0;
            animation: pl-logo-fill-in 1.2s ease-out 0.25s forwards;
          }

          @keyframes pl-board-reveal {
            0% {
              opacity: 0;
            }

            35% {
              opacity: 0.85;
            }

            100% {
              opacity: 0.62;
            }
          }

          @keyframes pl-board-draw {
            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes pl-arc-draw {
            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes pl-details-show-medium {
            to {
              opacity: 0.72;
            }
          }

          @keyframes pl-details-show-strong {
            to {
              opacity: 0.92;
            }
          }

          @keyframes pl-logo-scale {
            from {
              transform: scale(1.1);
            }

            to {
              transform: scale(1);
            }
          }

          @keyframes pl-logo-draw {
            to {
              stroke-dashoffset: 0;
            }
          }

          @keyframes pl-logo-fill-in {
            to {
              opacity: 1;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .pl-board,
            .pl-board-frame,
            .pl-board-lines,
            .pl-board-circle,
            .pl-board-arc,
            .pl-board-details,
            .pl-logo-zoom,
            .pl-logo-outline,
            .pl-logo-fill {
              animation: none;
            }

            .pl-board {
              opacity: 0.62;
            }

            .pl-board-frame,
            .pl-board-arc,
            .pl-logo-outline {
              stroke-dashoffset: 0;
            }

            .pl-board-lines {
              opacity: 0.92;
            }

            .pl-board-circle {
              opacity: 0.72;
            }

            .pl-board-details,
            .pl-logo-fill {
              opacity: 1;
            }

            .pl-logo-zoom {
              transform: scale(1);
            }
          }
        `}
      </style>
    </svg>
  )
}

export default AnimatedLogo
