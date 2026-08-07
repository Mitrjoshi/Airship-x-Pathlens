// src/tracker.ts

import { registerEvents } from "./events";
import type {
  ClientAnalyticsInfo,
  EventPayload,
  EventType,
  PathLensConfig,
  TrackedEvent,
} from "@workspace/contracts/tracker";
import {
  createSessionId,
  createVisitorId,
  debug,
  flushQueue,
  getAnalyticsInfo,
  getPageInfo,
  now,
} from "./utils";

export class PathLensTracker {
  public readonly config: PathLensConfig;

  public readonly visitorId: string;

  public readonly sessionId: string;

  public readonly sessionStart: number;

  public readonly analyticsInfo: ClientAnalyticsInfo;

  public readonly queue: TrackedEvent[] = [];

  private flushTimer?: number;

  constructor(config: PathLensConfig) {
    this.config = config;

    this.visitorId = createVisitorId();

    this.sessionId = createSessionId();

    this.sessionStart = Date.now();

    this.analyticsInfo = getAnalyticsInfo();
  }

  init(): void {
    debug(this.config, "Initializing tracker");

    this.track("session_start", {
      screen: {
        width: screen.width,
        height: screen.height,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    });

    registerEvents(this);

    this.startFlushTimer();

    debug(this.config, "Tracker initialized");
  }

  track(type: EventType, payload: EventPayload = {}): void {
    const event: TrackedEvent = {
      ...payload,
      ...getPageInfo(),
      ...this.analyticsInfo,
      type,
      timestamp: now(),
      projectId: this.config.projectId,
      sessionId: this.sessionId,
      visitorId: this.visitorId,
    };

    this.queue.push(event);

    debug(this.config, type, event);

    if (this.queue.length >= (this.config.batchSize ?? 25)) {
      this.flush();
    }
  }

  flush(): void {
    flushQueue(this.config, this.queue);
  }

  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flush();
  }

  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.config.flushInterval ?? 5000);
  }
}
