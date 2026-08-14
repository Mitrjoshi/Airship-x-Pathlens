// src/types.ts

export interface PathLensConfig {
  projectId: string
  apiUrl: string

  debug?: boolean

  captureClicks?: boolean
  captureScroll?: boolean
  captureMouseMove?: boolean
  captureResize?: boolean
  captureForms?: boolean
  captureInputs?: boolean
  captureErrors?: boolean
  capturePerformance?: boolean
  captureNavigation?: boolean

  flushInterval?: number
  batchSize?: number

  replayApiUrl?: string
  captureReplay?: boolean
  replayFlushInterval?: number
  replayBatchSize?: number
}

export interface CampaignAttribution {
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
}

export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'unknown'

export interface ClientAnalyticsInfo {
  device: DeviceType
  browser: string
  browserVersion: string | null
  os: string
  osVersion: string | null
  countryCode?: string
  language: string
  timezone: string
  userAgent: string
  referrer: string
}

export type EventType =
  | 'session_start'
  | 'session_end'
  | 'page_view'
  | 'click'
  | 'scroll'
  | 'mousemove'
  | 'resize'
  | 'form_submit'
  | 'input_change'
  | 'javascript_error'
  | 'promise_rejection'
  | 'performance'
  | 'custom'

export interface BaseEvent {
  type: EventType

  timestamp: string

  projectId: string

  sessionId: string

  visitorId: string

  url: string

  path: string

  title: string

  device: DeviceType

  browser: string

  browserVersion: string | null

  os: string

  osVersion: string | null

  countryCode?: string

  language: string

  timezone: string

  userAgent: string

  referrer: string

  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmTerm?: string
  utmContent?: string
}

export interface ClickEvent {
  x: number
  y: number

  pageX: number
  pageY: number

  scrollX: number
  scrollY: number

  tag: string

  id: string

  className: string

  text: string

  buttonText?: string
}

export interface ScrollEvent {
  scrollY: number

  percentage: number
}

export interface MouseMoveEvent {
  x: number

  y: number

  pageX: number
  pageY: number

  scrollX: number
  scrollY: number
}

export interface ResizeEvent {
  width: number

  height: number
}

export interface FormSubmitEvent {
  id: string

  action: string

  method: string
}

export interface InputChangeEvent {
  id: string

  name: string

  type: string
}

export interface JavaScriptErrorEvent {
  name?: string
  message: string

  file: string

  line: number

  column: number

  stack?: string
}

export interface PromiseRejectionEvent {
  name?: string
  reason: string

  stack?: string
}

export interface PerformanceEvent {
  dns: number

  tcp: number

  ttfb: number

  domLoaded: number

  load: number
}

export interface SessionStartEvent {
  screen: {
    width: number
    height: number
  }

  viewport: {
    width: number
    height: number
  }

  language: string

  timezone: string

  userAgent: string

  referrer: string
}

export interface SessionEndEvent {
  duration: number

  totalEvents: number
}

export type EventPayload =
  | ClickEvent
  | ScrollEvent
  | MouseMoveEvent
  | ResizeEvent
  | FormSubmitEvent
  | InputChangeEvent
  | JavaScriptErrorEvent
  | PromiseRejectionEvent
  | PerformanceEvent
  | SessionStartEvent
  | SessionEndEvent
  | Record<string, unknown>

export type TrackedEvent = BaseEvent & EventPayload
