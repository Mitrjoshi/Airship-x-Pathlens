import type {
  AnalyticsSummaryComparison,
  AnalyticsSummaryReport,
} from "@workspace/contracts";

const MAX_PROJECT_NAME_LENGTH = 120;
const MAX_PATH_LENGTH = 180;
const MAX_EVENT_TYPE_LENGTH = 100;
const MAX_FUNNELS = 3;
const MAX_FUNNEL_STEPS = 8;

export type SlackReportBlock =
  | {
      type: "header";
      text: { type: "plain_text"; text: string; emoji?: boolean };
    }
  | {
      type: "section";
      text?: { type: "mrkdwn"; text: string };
      fields?: Array<{ type: "mrkdwn"; text: string }>;
    }
  | { type: "divider" }
  | {
      type: "context";
      elements: Array<{ type: "mrkdwn"; text: string }>;
    }
  | {
      type: "actions";
      elements: Array<{
        type: "button";
        text: { type: "plain_text"; text: string; emoji?: boolean };
        url: string;
        action_id: string;
      }>;
    };

export type SlackAnalyticsReportPayload = {
  text: string;
  blocks: SlackReportBlock[];
};

export type SlackReportFormatterInput = {
  report: AnalyticsSummaryReport;
  projectName: string;
  workspaceId: string;
  applicationUrl?: string;
};

function truncate(value: string, maxLength: number) {
  const characters = Array.from(value);
  if (characters.length <= maxLength) return value;
  return `${characters.slice(0, Math.max(0, maxLength - 1)).join("")}…`;
}

function escapeMrkdwn(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeLabel(value: string, maxLength: number) {
  return escapeMrkdwn(truncate(value, maxLength));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(
    value
  );
}

function formatPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function formatComparison(comparison: AnalyticsSummaryComparison) {
  if (comparison.percentChange === null) return "New activity";
  if (comparison.percentChange === 0) return "0%";
  return formatPercent(comparison.percentChange);
}

function formatMetric(
  label: string,
  value: number,
  comparison: AnalyticsSummaryComparison
) {
  return `*${label}*\n${formatNumber(value)}\n_${formatComparison(comparison)}_`;
}

function getDateFormatter(timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getPeriodLabel(report: AnalyticsSummaryReport) {
  const formatter = getDateFormatter(report.period.timezone);
  const start = new Date(report.period.start);
  const endExclusive = new Date(report.period.end);
  const end = new Date(endExclusive.getTime() - 1);
  if (report.reportType === "daily") return formatter.format(start);
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function getDashboardUrl(input: SlackReportFormatterInput) {
  const base = input.applicationUrl?.trim();
  if (!base) return null;
  try {
    const url = new URL(base);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return new URL(
      `/app/${encodeURIComponent(input.workspaceId)}/${encodeURIComponent(input.report.projectId)}`,
      url
    ).toString();
  } catch {
    return null;
  }
}

function getFallbackText(
  input: SlackReportFormatterInput,
  periodLabel: string,
  dashboardUrl: string | null
) {
  const { report } = input;
  const lines = [
    `Pathlens — ${report.reportType === "daily" ? "Daily" : "Weekly"} Analytics Report`,
    `Project: ${escapeMrkdwn(truncate(input.projectName, MAX_PROJECT_NAME_LENGTH))}`,
    `Reporting period: ${escapeMrkdwn(periodLabel)} (${escapeMrkdwn(report.period.timezone)})`,
    `Unique visitors: ${formatNumber(report.metrics.uniqueVisitors.value)} (${formatComparison(report.metrics.uniqueVisitors.comparison)})`,
    `Sessions: ${formatNumber(report.metrics.totalSessions.value)} (${formatComparison(report.metrics.totalSessions.comparison)})`,
    `Page views: ${formatNumber(report.metrics.pageViews.value)} (${formatComparison(report.metrics.pageViews.comparison)})`,
    `Total events: ${formatNumber(report.metrics.totalEvents.value)} (${formatComparison(report.metrics.totalEvents.comparison)})`,
  ];
  if (dashboardUrl) lines.push(`View dashboard: ${dashboardUrl}`);
  return lines.join("\n");
}

function getTopPagesBlock(
  report: AnalyticsSummaryReport
): SlackReportBlock | null {
  if (!report.topPages.length) return null;
  const lines = report.topPages.slice(0, 5).map((page, index) => {
    const path = page.path
      ? safeLabel(page.path, MAX_PATH_LENGTH)
      : "(unknown path)";
    return `${index + 1}. ${path} — ${formatNumber(page.views)} views (${formatComparison(page.comparison)})`;
  });
  return {
    type: "section",
    text: { type: "mrkdwn", text: `*Top pages*\n${lines.join("\n")}` },
  };
}

function getTopEventsBlock(
  report: AnalyticsSummaryReport
): SlackReportBlock | null {
  if (report.reportType !== "weekly" || !report.topEvents.length) return null;
  const lines = report.topEvents
    .slice(0, 5)
    .map(
      (event, index) =>
        `${index + 1}. ${safeLabel(event.type, MAX_EVENT_TYPE_LENGTH)} — ${formatNumber(event.count)} (${formatComparison(event.comparison)})`
    );
  return {
    type: "section",
    text: { type: "mrkdwn", text: `*Top events*\n${lines.join("\n")}` },
  };
}

function formatPercentagePoints(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} pp`;
}

function getFunnelsBlock(
  report: AnalyticsSummaryReport
): SlackReportBlock | null {
  if (report.reportType !== "weekly" || !report.funnels.length) return null;
  const sections = report.funnels.slice(0, MAX_FUNNELS).map((funnel) => {
    const steps = funnel.steps
      .slice(0, MAX_FUNNEL_STEPS)
      .map(
        (step) => `${safeLabel(step.name, 100)}: ${formatNumber(step.visitors)}`
      )
      .join(" · ");
    return `*${safeLabel(funnel.name, 120)}*\nConversion: ${funnel.conversionRate.toFixed(1)}%\nChange: ${formatComparison(funnel.conversionComparison)} relative; ${formatPercentagePoints(funnel.conversionComparison.percentagePointChange)} absolute\n${steps}`;
  });
  const text = truncate(`*Funnels*\n${sections.join("\n\n")}`, 2800);
  return {
    type: "section",
    text: { type: "mrkdwn", text },
  };
}

export function formatSlackAnalyticsReport(
  input: SlackReportFormatterInput
): SlackAnalyticsReportPayload {
  const reportTitle = reportTitleFor(input.report.reportType);
  const periodLabel = getPeriodLabel(input.report);
  const dashboardUrl = getDashboardUrl(input);
  const projectName = safeLabel(input.projectName, MAX_PROJECT_NAME_LENGTH);
  const blocks: SlackReportBlock[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `Pathlens — ${reportTitle}`,
        emoji: false,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `*Project:* ${projectName}  •  *Period:* ${safeLabel(periodLabel, 100)}  •  *Timezone:* ${safeLabel(input.report.period.timezone, 80)}`,
        },
      ],
    },
    { type: "divider" },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: formatMetric(
            "Unique visitors",
            input.report.metrics.uniqueVisitors.value,
            input.report.metrics.uniqueVisitors.comparison
          ),
        },
        {
          type: "mrkdwn",
          text: formatMetric(
            "Sessions",
            input.report.metrics.totalSessions.value,
            input.report.metrics.totalSessions.comparison
          ),
        },
        {
          type: "mrkdwn",
          text: formatMetric(
            "Page views",
            input.report.metrics.pageViews.value,
            input.report.metrics.pageViews.comparison
          ),
        },
        {
          type: "mrkdwn",
          text: formatMetric(
            "Total events",
            input.report.metrics.totalEvents.value,
            input.report.metrics.totalEvents.comparison
          ),
        },
      ],
    },
  ];
  const topPages = getTopPagesBlock(input.report);
  if (topPages) blocks.push(topPages);
  const topEvents = getTopEventsBlock(input.report);
  if (topEvents) blocks.push(topEvents);
  const funnels = getFunnelsBlock(input.report);
  if (funnels) blocks.push(funnels);
  if (dashboardUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View dashboard", emoji: false },
          url: dashboardUrl,
          action_id: "view_pathlens_dashboard",
        },
      ],
    });
  }
  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: "Pathlens analytics summary" }],
  });

  return {
    text: getFallbackText(input, periodLabel, dashboardUrl),
    blocks,
  };
}

function reportTitleFor(reportType: AnalyticsSummaryReport["reportType"]) {
  return reportType === "daily"
    ? "Daily Analytics Report"
    : "Weekly Analytics Report";
}
