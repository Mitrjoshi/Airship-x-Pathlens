import { EventEmitter } from "node:events";
import type { ChatLiveEvent } from "@workspace/contracts";

export type { ChatLiveEvent } from "@workspace/contracts";

type ChatLiveListener = (event: ChatLiveEvent) => void;

const chatEmitter = new EventEmitter();

chatEmitter.setMaxListeners(0);

function getChannelRoom(channelId: string): string {
  return `chat:channel:${channelId}`;
}

export function publishChatEvent(
  channelId: string,
  event: ChatLiveEvent
): void {
  chatEmitter.emit(getChannelRoom(channelId), event);
}

export function subscribeToChatChannel(
  channelId: string,
  listener: ChatLiveListener
): () => void {
  const room = getChannelRoom(channelId);

  chatEmitter.on(room, listener);

  return () => chatEmitter.off(room, listener);
}
