import {
  EventType,
  IncrementalSource,
  MouseInteractions,
  ReplayerEvents,
} from 'rrweb'
import type { eventWithTime, Replayer } from 'rrweb'

const CURSOR_COLOR = '#41ce8f'

// macOS-inspired cursor.
// The first point (2, 2) is the cursor hotspot.
const cursorSvg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="26" height="32" viewBox="0 0 26 32">
  <path
    d="M2 2V25.5L8.4 19.2L13.5 29.5L17.5 27.5L12.4 17.2H23L2 2Z"
    fill="${CURSOR_COLOR}"
    stroke="#ffffff"
    stroke-width="1.65"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
</svg>
`

const cursorUrl = `url("data:image/svg+xml,${encodeURIComponent(cursorSvg)}")`

const REPLAY_CURSOR_STYLE = `
/* =========================================
   CURSOR
========================================= */

.replayer-wrapper .replayer-mouse {
  width: 26px !important;
  height: 32px !important;

  margin: 0 !important;
  padding: 0 !important;

  border: 0 !important;
  border-radius: 0 !important;

  background: transparent ${cursorUrl} 0 0 / 26px 32px no-repeat !important;

  box-shadow: none !important;
  filter: none !important;

  pointer-events: none !important;
  z-index: 999999 !important;

  will-change: transform;
}

/* =========================================
   MOUSE TRAIL
========================================= */

.replayer-wrapper .replayer-mouse-tail {
  opacity: 1 !important;

  pointer-events: none !important;
  z-index: 999997 !important;

  filter: none !important;
  box-shadow: none !important;
}

.replayer-wrapper .replayer-mouse-tail path,
.replayer-wrapper .replayer-mouse-tail polyline,
.replayer-wrapper .replayer-mouse-tail line {
  stroke: ${CURSOR_COLOR} !important;
  stroke-width: 5px !important;

  stroke-linecap: round !important;
  stroke-linejoin: round !important;

  opacity: 0.95 !important;
  fill: none !important;

  filter: none !important;
}

.replayer-wrapper svg.replayer-mouse-tail {
  overflow: visible !important;
}

/* Hide rrweb's default click indicator */
.replayer-wrapper .replayer-mouse::after,
.replayer-wrapper .replayer-mouse.active::after {
  display: none !important;
  content: none !important;
}

/* =========================================
   CLICK EFFECT
========================================= */

.replayer-wrapper .pathlens-replay-click {
  position: absolute;
  z-index: 999998;

  width: 0;
  height: 0;

  pointer-events: none;
  transform: translate(-50%, -50%);
}

/* Primary green ripple */
.replayer-wrapper .pathlens-replay-click::before {
  content: "";
  position: absolute;

  width: 44px;
  height: 44px;

  left: -22px;
  top: -22px;

  border: 3px solid ${CURSOR_COLOR};
  border-radius: 50%;

  background: rgb(65 206 143 / 18%);

  box-shadow: none;
  filter: none;

  animation:
    pathlens-click-primary 650ms
    cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

/* Secondary white ripple */
.replayer-wrapper .pathlens-replay-click::after {
  content: "";
  position: absolute;

  width: 28px;
  height: 28px;

  left: -14px;
  top: -14px;

  border: 2px solid #ffffff;
  border-radius: 50%;

  background: rgb(65 206 143 / 25%);

  box-shadow: none;
  filter: none;

  animation:
    pathlens-click-secondary 500ms
    cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
}

/* =========================================
   CLICK ANIMATIONS
========================================= */

@keyframes pathlens-click-primary {
  0% {
    opacity: 1;
    transform: scale(0.25);
  }

  35% {
    opacity: 0.95;
  }

  100% {
    opacity: 0;
    transform: scale(2.3);
  }
}

@keyframes pathlens-click-secondary {
  0% {
    opacity: 1;
    transform: scale(0.25);
  }

  45% {
    opacity: 0.85;
  }

  100% {
    opacity: 0;
    transform: scale(1.7);
  }
}

/* =========================================
   REDUCED MOTION
========================================= */

@media (prefers-reduced-motion: reduce) {
  .replayer-wrapper .pathlens-replay-click::before,
  .replayer-wrapper .pathlens-replay-click::after {
    animation-duration: 100ms;
  }
}
`

/* =========================================
   STYLE INSTALLATION
========================================= */

function appendStyle(document: Document | null): HTMLStyleElement | null {
  if (!document) return null

  const style = document.createElement('style')

  style.dataset.pathlensReplayCursor = 'true'
  style.textContent = REPLAY_CURSOR_STYLE

  document.head.append(style)

  return style
}

export function installReplayCursorStyle(replayer: Replayer): () => void {
  const style = appendStyle(replayer.wrapper.ownerDocument)

  return () => {
    style?.remove()
  }
}

/* =========================================
   CLICK EFFECT INSTALLATION
========================================= */

export function installReplayClickEffect(replayer: Replayer): () => void {
  const markers = new Set<HTMLDivElement>()

  const handleEvent = (event: eventWithTime) => {
    if (
      event.type !== EventType.IncrementalSnapshot ||
      event.data.source !== IncrementalSource.MouseInteraction ||
      event.data.type !== MouseInteractions.Click
    ) {
      return
    }

    const { x, y } = event.data

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return
    }

    const marker = replayer.wrapper.ownerDocument.createElement('div')

    marker.className = 'pathlens-replay-click'
    marker.style.left = `${x}px`
    marker.style.top = `${y}px`

    markers.add(marker)
    replayer.wrapper.append(marker)

    marker.addEventListener('animationend', (animationEvent) => {
      if (animationEvent.animationName !== 'pathlens-click-primary') {
        return
      }

      markers.delete(marker)
      marker.remove()
    })
  }

  replayer.on(ReplayerEvents.EventCast, handleEvent)

  return () => {
    replayer.off(ReplayerEvents.EventCast, handleEvent)

    for (const marker of markers) {
      marker.remove()
    }

    markers.clear()
  }
}
