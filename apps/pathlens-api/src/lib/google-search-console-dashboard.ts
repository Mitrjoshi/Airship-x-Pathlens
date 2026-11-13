export type DashboardSearchConsoleRange = "24h" | "7d" | "30d" | "90d";

const COMPLETE_DAYS: Record<DashboardSearchConsoleRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

/** Search Console data is final calendar-day data and is reported in UTC. */
export function getDashboardSearchConsoleDateRange(
  range: DashboardSearchConsoleRange,
  now = new Date()
) {
  const end = new Date(now);
  end.setUTCHours(0, 0, 0, 0);
  end.setUTCDate(end.getUTCDate() - 1);

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - COMPLETE_DAYS[range] + 1);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    timezone: "UTC" as const,
  };
}
