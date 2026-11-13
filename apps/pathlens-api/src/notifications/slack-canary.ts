import { createHash } from "node:crypto";

import {
  formatSlackAnalyticsReport,
  type SlackReportFormatterInput,
} from "./slack-report-formatter";

export const CANARY_TARGET = Object.freeze({
  integrationId: "4334dc64-15ca-4e44-996c-2c2ffa841478",
  projectId: "ccfd246f-cb0c-4ee5-a143-dd3bce3e5780",
  workspaceId: "d1158722-969a-48cc-9fc4-ede482ebf69f",
});

// Preparation only: deliberately no Slack send, queue, or delivery imports.
export function prepareSlackCanary(
  input: SlackReportFormatterInput & {
    integrationId: string;
    projectId: string;
    destinationChannel: string;
    configuredChannel: string;
  }
) {
  if (
    input.integrationId !== CANARY_TARGET.integrationId ||
    input.projectId !== CANARY_TARGET.projectId ||
    input.workspaceId !== CANARY_TARGET.workspaceId ||
    input.report.projectId !== input.projectId ||
    input.report.reportType !== "daily"
  ) {
    throw new Error("Canary ownership or report mismatch.");
  }
  if (
    !/^[CG][A-Z0-9]+$/.test(input.destinationChannel) ||
    input.destinationChannel !== input.configuredChannel
  ) {
    throw new Error("Explicit destination must match the configured channel.");
  }
  const formatted = formatSlackAnalyticsReport(input);
  const notice = "One-time test only — not an automatically scheduled report.";
  const message = {
    channel: input.destinationChannel,
    text: `Pathlens — Test Notification\n${notice}\n${formatted.text}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: "Pathlens — Test Notification" },
      },
      { type: "section", text: { type: "plain_text", text: notice } },
      ...formatted.blocks,
    ],
  };
  return {
    message,
    approvalDigest: createHash("sha256")
      .update(JSON.stringify(message))
      .digest("hex"),
  };
}
