import { EventEmitter } from "node:events";
import type { ReplayEvent } from "@workspace/contracts";

export interface ReplayChunkUpdate {
  sessionId: string;
  sequence: number;
  events: ReplayEvent[];
  isFinal: boolean;
}

type ReplayChunkListener = (update: ReplayChunkUpdate) => void;

const replayEmitter = new EventEmitter();

replayEmitter.setMaxListeners(0);

function getChannel(sessionId: string): string {
  return `replay:${sessionId}`;
}

export function publishReplayChunk(update: ReplayChunkUpdate): void {
  replayEmitter.emit(getChannel(update.sessionId), update);
}

export function subscribeToReplay(
  sessionId: string,
  listener: ReplayChunkListener
): () => void {
  const channel = getChannel(sessionId);

  replayEmitter.on(channel, listener);

  return () => replayEmitter.off(channel, listener);
}
