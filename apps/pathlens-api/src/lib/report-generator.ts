import ExcelJS from "exceljs";

import type {
  AnalyticsResponse,
  AnalyticsDevice,
  AnalyticsRange,
} from "../models/analytics.model";

export type ReportType =
  | "full"
  | "overview"
  | "traffic"
  | "pages"
  | "devices"
  | "referrers"
  | "countries"
  | "browsers";

export const REPORT_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type ReportFilters = {
  range: AnalyticsRange;
  device: AnalyticsDevice;
  domain?: string;
};

function addSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  headers: string[],
  rows: Array<Array<string | number>>
) {
  const sheet = workbook.addWorksheet(name);
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F2937" },
  };

  for (const row of rows) sheet.addRow(row);

  sheet.columns.forEach((column) => {
    let width = 12;
    column.eachCell({ includeEmpty: false }, (cell) => {
      width = Math.max(width, String(cell.value ?? "").length + 2);
    });
    column.width = Math.min(width, 48);
  });
}

function addOverviewSheet(
  workbook: ExcelJS.Workbook,
  analytics: AnalyticsResponse,
  filters: ReportFilters
) {
  addSheet(
    workbook,
    "Overview",
    ["Metric", "Value"],
    [
      ["Visitors", analytics.summary.visitors],
      ["Sessions", analytics.summary.sessions],
      ["Page views", analytics.summary.pageViews],
      ["Bounce rate", `${analytics.summary.bounceRate}%`],
      ["Average duration", analytics.summary.avgDuration],
      ["New visitors", analytics.visitorBreakdown.new],
      ["Returning visitors", analytics.visitorBreakdown.returning],
      ["Date range", filters.range],
      ["Device", filters.device],
      ["Domain", filters.domain ?? "All domains"],
    ]
  );
}

function addSelectedSheet(
  workbook: ExcelJS.Workbook,
  reportType: ReportType,
  analytics: AnalyticsResponse
) {
  if (reportType === "traffic") {
    addSheet(
      workbook,
      "Traffic",
      ["Day", "Visitors", "Sessions"],
      analytics.traffic.map((row) => [row.day, row.visitors, row.sessions])
    );
  }

  if (reportType === "pages") {
    addSheet(
      workbook,
      "Pages",
      ["Page", "Views", "Average duration"],
      analytics.pages.map((row) => [
        row.page ?? "Unknown",
        row.views,
        row.duration,
      ])
    );
  }

  if (reportType === "devices") {
    addSheet(
      workbook,
      "Devices",
      ["Device", "Share"],
      analytics.devices.map((row) => [row.name, `${row.value}%`])
    );
  }

  if (reportType === "referrers") {
    addSheet(
      workbook,
      "Referrers",
      ["Referrer", "Visitors"],
      analytics.referrers.map((row) => [row.name, row.visitors])
    );
  }

  if (reportType === "countries") {
    addSheet(
      workbook,
      "Countries",
      ["Country", "Code", "Visitors"],
      analytics.countries.map((row) => [row.name, row.code, row.visitors])
    );
  }

  if (reportType === "browsers") {
    addSheet(
      workbook,
      "Browsers",
      ["Browser", "Visitors"],
      analytics.browsers.map((row) => [row.name, row.visitors])
    );
  }
}

export async function generateReportWorkbook(data: {
  reportType: ReportType;
  analytics: AnalyticsResponse;
  filters: ReportFilters;
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  if (data.reportType === "full" || data.reportType === "overview") {
    addOverviewSheet(workbook, data.analytics, data.filters);
  }

  if (data.reportType === "full") {
    for (const reportType of [
      "traffic",
      "pages",
      "devices",
      "referrers",
      "countries",
      "browsers",
    ] as const) {
      addSelectedSheet(workbook, reportType, data.analytics);
    }
  } else if (data.reportType !== "overview") {
    addSelectedSheet(workbook, data.reportType, data.analytics);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
