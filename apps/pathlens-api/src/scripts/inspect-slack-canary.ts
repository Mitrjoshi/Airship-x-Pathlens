import { prepareCanary } from "./prepare-slack-canary";
import { CANARY_TARGET } from "../notifications/slack-canary";
import {
  APPROVED_CHANNEL,
  APPROVED_HASH,
} from "../notifications/slack-canary-send";

// Read-only diagnostic. No reservation or send imports/calls.
prepareCanary(
  CANARY_TARGET.integrationId,
  APPROVED_CHANNEL,
  new Date("2026-11-12T00:00:00.000Z")
)
  .then((result) => {
    if (!result) throw new Error("Preparation unavailable.");
    console.log(
      JSON.stringify(
        {
          workspaceMatches: result.workspace === "Pathlens",
          projectMatches: result.project === "Portfolio",
          actorPresent: Boolean(result.actorUserId),
          period: result.period,
          payloadMatches: result.approvalDigest === APPROVED_HASH,
          actualHash: result.approvalDigest,
          preview: result.message.text,
        },
        null,
        2
      )
    );
  })
  .catch(() => {
    console.error("Read-only preparation diagnostic failed.");
    process.exitCode = 1;
  });
