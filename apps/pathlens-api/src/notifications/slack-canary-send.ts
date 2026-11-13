import { createHash } from "node:crypto";

import { CANARY_TARGET } from "./slack-canary";
import { SlackApiError } from "../lib/slack-api";

export const APPROVED_CHANNEL = "C0CG9AWFL3H";
export const APPROVED_HASH =
  "a7680ca38600b355321066e932fd897b30024e3fabff1e0277da841034b7ce02";
export const APPROVED_PERIOD = {
  start: "2026-11-10T18:30:00.000Z",
  end: "2026-11-11T18:30:00.000Z",
  timezone: "Asia/Kolkata",
};
const operationHash = createHash("sha256")
  .update(
    JSON.stringify({
      authorization: "pathlens-phase7f-one-message-v1",
      ...CANARY_TARGET,
      channel: APPROVED_CHANNEL,
      period: APPROVED_PERIOD,
      payloadHash: APPROVED_HASH,
    })
  )
  .digest("hex");
// UUID primary key in audit_logs; deterministic across processes and restarts.
export const CANARY_OPERATION_ID = `${operationHash.slice(0, 8)}-${operationHash.slice(8, 12)}-5${operationHash.slice(13, 16)}-a${operationHash.slice(17, 20)}-${operationHash.slice(20, 32)}`;

export interface CanaryStore {
  reserve(): Promise<boolean>;
  record(
    status: "SUCCEEDED" | "REJECTED" | "UNKNOWN",
    ts?: string
  ): Promise<void>;
}

export async function executeCanary(
  input: {
    integrationId: string;
    projectId: string;
    workspaceId: string;
    slackWorkspace: string;
    projectName: string;
    period: typeof APPROVED_PERIOD;
    message: { channel: string; text: string; blocks: unknown[] };
    accessToken: string;
  },
  store: CanaryStore,
  send: () => Promise<{ channel?: string; ts?: string }>
) {
  if (
    input.integrationId !== CANARY_TARGET.integrationId ||
    input.projectId !== CANARY_TARGET.projectId ||
    input.workspaceId !== CANARY_TARGET.workspaceId ||
    input.slackWorkspace !== "Pathlens" ||
    input.projectName !== "Portfolio" ||
    input.message.channel !== APPROVED_CHANNEL ||
    input.period.start !== APPROVED_PERIOD.start ||
    input.period.end !== APPROVED_PERIOD.end ||
    input.period.timezone !== APPROVED_PERIOD.timezone ||
    createHash("sha256").update(JSON.stringify(input.message)).digest("hex") !==
      APPROVED_HASH
  )
    throw new Error(
      "Approved destination, ownership, period, or payload mismatch."
    );
  if (!input.accessToken?.trim()) throw new Error("Missing credentials.");
  if (!(await store.reserve()))
    throw new Error("Canary attempt already consumed.");
  // No loops or retry. Any exception after reservation permanently consumes the attempt.
  try {
    const result = await send();
    if (result.channel !== APPROVED_CHANNEL || !result.ts)
      throw new Error("Ambiguous Slack response.");
    await store.record("SUCCEEDED", result.ts);
    return { status: "SUCCEEDED", channel: result.channel, ts: result.ts };
  } catch (error) {
    const status =
      error instanceof SlackApiError &&
      error.status !== undefined &&
      error.code !== "timeout"
        ? "REJECTED"
        : "UNKNOWN";
    await store.record(status);
    return { status };
  }
}
