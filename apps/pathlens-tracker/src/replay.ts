import type { ReplayChunk, ReplayEvent } from "@workspace/contracts";
import { record } from "rrweb";
import type { PathLensConfig } from "@workspace/contracts/tracker";
import { postEncryptedPayload } from "./crypto";

const REPLAY_CHECKOUT_INTERVAL = 60_000;

interface ReplayRecorderOptions {
  config: PathLensConfig;
  sessionId: string;
  visitorId: string;
}

function getDimensions() {
  return {
    screen: {
      width: window.screen.width,
      height: window.screen.height,
    },
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}

function getLocation() {
  return {
    url: window.location.href.slice(0, 2048),
    path: window.location.pathname.slice(0, 2048),
  };
}

export class ReplayRecorder {
  private readonly config: PathLensConfig;

  private readonly sessionId: string;

  private readonly visitorId: string;

  private readonly pendingEvents: ReplayEvent[] = [];

  private sequence = 0;

  private stopRecording?: () => void;

  private flushTimer?: number;

  private flushChain: Promise<void> = Promise.resolve();

  private stopped = false;

  constructor({ config, sessionId, visitorId }: ReplayRecorderOptions) {
    this.config = config;
    this.sessionId = sessionId;
    this.visitorId = visitorId;
  }

  start(): void {
    if (!this.config.captureReplay || this.stopRecording) return;

    this.stopRecording = record<ReplayEvent>({
      emit: (event) => this.enqueue(event),
      blockClass: "pathlens-replay-block",
      blockSelector: "[data-pathlens-block]",
      maskAllInputs: true,
      maskTextSelector: "[data-pathlens-mask]",
      inlineStylesheet: true,
      collectFonts: true,
      recordCanvas: false,
      recordCrossOriginIframes: false,
      checkoutEveryNms: REPLAY_CHECKOUT_INTERVAL,
      mousemoveWait: 100,
    });

    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.config.replayFlushInterval ?? 1_500);
  }

  stop(): void {
    if (this.stopped) return;

    this.stopped = true;
    this.stopRecording?.();

    if (this.flushTimer) {
      window.clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    this.flush(true);
  }

  private enqueue(event: ReplayEvent): void {
    if (this.stopped) return;

    this.pendingEvents.push(event);

    if (this.pendingEvents.length >= (this.config.replayBatchSize ?? 100)) {
      this.flush();
    }
  }

  private flush(isFinal = false): void {
    this.flushChain = this.flushChain.then(() =>
      this.flushPendingEvents(isFinal)
    );
  }

  private async flushPendingEvents(isFinal: boolean): Promise<void> {
    const batchSize = this.config.replayBatchSize ?? 100;

    while (this.pendingEvents.length > 0) {
      const events = this.pendingEvents.splice(0, batchSize);
      const chunk: ReplayChunk = {
        projectId: this.config.projectId,
        sessionId: this.sessionId,
        visitorId: this.visitorId,
        sequence: this.sequence,
        events,
        ...getDimensions(),
        ...getLocation(),
        ...(isFinal && this.pendingEvents.length === 0
          ? { isFinal: true }
          : {}),
      };

      const sent = await this.sendChunk(chunk, Boolean(chunk.isFinal));

      if (!sent) {
        this.pendingEvents.unshift(...events);
        return;
      }

      this.sequence += 1;

      if (!isFinal) return;
    }
  }

  private async sendChunk(
    chunk: ReplayChunk,
    isFinal: boolean
  ): Promise<boolean> {
    const apiUrl =
      this.config.replayApiUrl ?? "http://localhost:8080/api/replay/chunks";

    try {
      const response = await postEncryptedPayload(
        apiUrl,
        this.config.projectId,
        chunk,
        isFinal
      );

      return response.ok;
    } catch {
      return false;
    }
  }
}
