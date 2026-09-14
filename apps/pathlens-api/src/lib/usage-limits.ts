export const WORKSPACE_USAGE_LIMITS = {
  pageViews: 10_000,
  events: 100_000,
  recordings: 100,
  heatmapPages: 10,
  funnels: 3,
  goals: 3,
  projects: 5,
} as const;

export type WorkspaceUsageMetric = keyof typeof WORKSPACE_USAGE_LIMITS;

export class WorkspaceUsageLimitError extends Error {
  readonly metric: WorkspaceUsageMetric;
  readonly limit: number;

  constructor(metric: WorkspaceUsageMetric) {
    const limit = WORKSPACE_USAGE_LIMITS[metric];

    super(`Workspace ${metric} limit reached (${limit}).`);
    this.name = "WorkspaceUsageLimitError";
    this.metric = metric;
    this.limit = limit;
  }
}
