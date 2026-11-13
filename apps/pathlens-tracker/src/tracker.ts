// src/tracker.ts

import { registerEvents } from "./events";
import type {
  CampaignAttribution,
  ClientAnalyticsInfo,
  EventPayload,
  EventType,
  PathLensConfig,
  TrackingScope,
  TrackedEvent,
} from "@workspace/contracts/tracker";
import {
  createSessionId,
  createVisitorId,
  debug,
  enqueueEvent,
  flushQueue,
  getAnalyticsInfo,
  getCampaignAttribution,
  getPageInfo,
  now,
  touchSession,
} from "./utils";
import { ReplayRecorder } from "./replay";

export class PathLensTracker {
  public readonly config: PathLensConfig;

  public readonly visitorId: string;

  public readonly sessionId: string;

  public readonly sessionStart: number;

  public readonly analyticsInfo: ClientAnalyticsInfo;

  public readonly queue: TrackedEvent[] = [];

  public readonly replayRecorder?: ReplayRecorder;

  private campaignAttribution: CampaignAttribution;

  private flushTimer?: number;

  constructor(config: PathLensConfig) {
    this.config = config;

    this.visitorId = createVisitorId();

    this.sessionId = createSessionId();

    this.sessionStart = Date.now();

    this.analyticsInfo = getAnalyticsInfo();
    this.campaignAttribution = getCampaignAttribution(config.apiKey);

    if (this.canTrackScope("replay")) {
      this.replayRecorder = new ReplayRecorder({
        config,
        sessionId: this.sessionId,
        visitorId: this.visitorId,
      });
    }
  }

  init(): void {
    debug(this.config, "Initializing tracker");

    this.replayRecorder?.start();

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
    if (!this.canTrackScope(this.getScopeForEventType(type))) return;

    touchSession();

    if (Object.keys(this.campaignAttribution).length === 0) {
      this.campaignAttribution = getCampaignAttribution(this.config.apiKey);
    }

    const event: TrackedEvent = {
      ...payload,
      ...getPageInfo(),
      ...this.analyticsInfo,
      ...this.campaignAttribution,
      type,
      eventId: crypto.randomUUID(),
      timestamp: now(),
      sessionId: this.sessionId,
      visitorId: this.visitorId,
    };

    enqueueEvent(this.config, this.queue, event);

    debug(this.config, type, { eventId: event.eventId, eventType: type });

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

    this.replayRecorder?.stop();
    flushQueue(this.config, this.queue, true);
  }

  private startFlushTimer(): void {
    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.config.flushInterval ?? 5000);
  }

  private canTrackScope(scope: TrackingScope): boolean {
    return this.config.trackingScopes.includes(scope);
  }

  private getScopeForEventType(type: EventType): TrackingScope {
    if (type === "javascript_error" || type === "promise_rejection") {
      return "errors";
    }

    if (type === "performance") return "performance";

    return "events";
  }
}
