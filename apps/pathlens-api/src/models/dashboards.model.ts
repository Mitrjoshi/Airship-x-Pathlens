import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import type {
  Dashboard,
  DashboardSummary,
  DashboardWidget,
  DashboardWidgetConfig,
  DashboardWidgetCreatePayload,
  DashboardWidgetLayout,
} from "@workspace/contracts";
import { dashboardWidgetConfigSchema } from "@workspace/contracts";
import { db } from "../db/client";
import { dashboardWidgets, dashboards } from "../db/schema";

interface DashboardDefinition {
  id: string;
  workspaceId: string;
  projectId: string;
  name: string;
  description: string | null;
  createdBy: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface DashboardWidgetDefinition {
  id: string;
  dashboardId: string;
  type: string;
  title: string | null;
  config: DashboardWidgetConfig;
  layout: DashboardWidgetLayout;
  orderIndex: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? new Date(0).toISOString()
    : date.toISOString();
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;

  if (typeof value === "string") return Number(value);

  return 0;
}

function toDashboardSummary(
  definition: DashboardDefinition,
  widgetCount: number
): DashboardSummary {
  return {
    id: definition.id,
    workspaceId: definition.workspaceId,
    projectId: definition.projectId,
    name: definition.name,
    description: definition.description,
    createdBy: definition.createdBy,
    widgetCount,
    createdAt: toIso(definition.createdAt),
    updatedAt: toIso(definition.updatedAt),
  };
}

function toDashboardWidget(
  definition: DashboardWidgetDefinition
): DashboardWidget {
  const config = dashboardWidgetConfigSchema.parse(definition.config);

  return {
    id: definition.id,
    dashboardId: definition.dashboardId,
    type: config.type,
    title: definition.title,
    config,
    layout: definition.layout,
    orderIndex: definition.orderIndex,
    createdAt: toIso(definition.createdAt),
    updatedAt: toIso(definition.updatedAt),
  };
}

function getDefaultLayout(orderIndex: number): DashboardWidgetLayout {
  return {
    x: orderIndex % 2 === 0 ? 0 : 6,
    y: Math.floor(orderIndex / 2) * 4,
    w: 6,
    h: 4,
  };
}

async function getDashboardDefinition(
  id: string,
  workspaceId: string,
  projectId: string
): Promise<DashboardDefinition | null> {
  const [definition] = await db
    .select({
      id: dashboards.id,
      workspaceId: dashboards.workspaceId,
      projectId: dashboards.projectId,
      name: dashboards.name,
      description: dashboards.description,
      createdBy: dashboards.createdBy,
      createdAt: dashboards.createdAt,
      updatedAt: dashboards.updatedAt,
    })
    .from(dashboards)
    .where(
      and(
        eq(dashboards.id, id),
        eq(dashboards.workspaceId, workspaceId),
        eq(dashboards.projectId, projectId)
      )
    );

  return definition ?? null;
}

export async function getDashboardsModel(
  workspaceId: string,
  projectId: string
): Promise<DashboardSummary[]> {
  const rows = await db
    .select({
      id: dashboards.id,
      workspaceId: dashboards.workspaceId,
      projectId: dashboards.projectId,
      name: dashboards.name,
      description: dashboards.description,
      createdBy: dashboards.createdBy,
      createdAt: dashboards.createdAt,
      updatedAt: dashboards.updatedAt,
      widgetCount: count(dashboardWidgets.id),
    })
    .from(dashboards)
    .leftJoin(dashboardWidgets, eq(dashboardWidgets.dashboardId, dashboards.id))
    .where(
      and(
        eq(dashboards.workspaceId, workspaceId),
        eq(dashboards.projectId, projectId)
      )
    )
    .groupBy(
      dashboards.id,
      dashboards.workspaceId,
      dashboards.projectId,
      dashboards.name,
      dashboards.description,
      dashboards.createdBy,
      dashboards.createdAt,
      dashboards.updatedAt
    )
    .orderBy(desc(dashboards.updatedAt));

  return rows.map((row) => toDashboardSummary(row, toNumber(row.widgetCount)));
}

export async function getDashboardByIdModel(data: {
  id: string;
  workspaceId: string;
  projectId: string;
}): Promise<Dashboard | null> {
  const definition = await getDashboardDefinition(
    data.id,
    data.workspaceId,
    data.projectId
  );

  if (!definition) return null;

  const widgets = await db
    .select({
      id: dashboardWidgets.id,
      dashboardId: dashboardWidgets.dashboardId,
      type: dashboardWidgets.type,
      title: dashboardWidgets.title,
      config: dashboardWidgets.config,
      layout: dashboardWidgets.layout,
      orderIndex: dashboardWidgets.orderIndex,
      createdAt: dashboardWidgets.createdAt,
      updatedAt: dashboardWidgets.updatedAt,
    })
    .from(dashboardWidgets)
    .where(eq(dashboardWidgets.dashboardId, data.id))
    .orderBy(asc(dashboardWidgets.orderIndex), asc(dashboardWidgets.createdAt));

  return {
    ...toDashboardSummary(definition, widgets.length),
    widgets: widgets.map(toDashboardWidget),
  };
}

export async function createDashboardModel(data: {
  workspaceId: string;
  projectId: string;
  name: string;
  description: string | null;
  createdBy: string;
}): Promise<string> {
  const [dashboard] = await db
    .insert(dashboards)
    .values({
      workspaceId: data.workspaceId,
      projectId: data.projectId,
      name: data.name,
      description: data.description,
      createdBy: data.createdBy,
    })
    .returning({ id: dashboards.id });

  return dashboard.id;
}

export async function updateDashboardModel(data: {
  id: string;
  workspaceId: string;
  projectId: string;
  name?: string;
  description?: string | null;
}): Promise<boolean> {
  const updated = await db
    .update(dashboards)
    .set({
      ...(data.name === undefined ? {} : { name: data.name }),
      ...(data.description === undefined
        ? {}
        : { description: data.description }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(dashboards.id, data.id),
        eq(dashboards.workspaceId, data.workspaceId),
        eq(dashboards.projectId, data.projectId)
      )
    )
    .returning({ id: dashboards.id });

  return updated.length > 0;
}

export async function deleteDashboardModel(data: {
  id: string;
  workspaceId: string;
  projectId: string;
}): Promise<boolean> {
  const deleted = await db
    .delete(dashboards)
    .where(
      and(
        eq(dashboards.id, data.id),
        eq(dashboards.workspaceId, data.workspaceId),
        eq(dashboards.projectId, data.projectId)
      )
    )
    .returning({ id: dashboards.id });

  return deleted.length > 0;
}

export async function createDashboardWidgetModel(
  data: DashboardWidgetCreatePayload & { dashboardId: string }
): Promise<string | null> {
  const dashboard = await getDashboardDefinition(
    data.dashboardId,
    data.workspace_id,
    data.project_id
  );

  if (!dashboard) return null;

  const [lastWidget] = await db
    .select({ orderIndex: dashboardWidgets.orderIndex })
    .from(dashboardWidgets)
    .where(eq(dashboardWidgets.dashboardId, data.dashboardId))
    .orderBy(desc(dashboardWidgets.orderIndex))
    .limit(1);
  const orderIndex = (lastWidget?.orderIndex ?? -1) + 1;

  const [widget] = await db
    .insert(dashboardWidgets)
    .values({
      dashboardId: data.dashboardId,
      type: data.config.type,
      title: data.title ?? null,
      config: data.config,
      layout: data.layout ?? getDefaultLayout(orderIndex),
      orderIndex,
    })
    .returning({ id: dashboardWidgets.id });

  await db
    .update(dashboards)
    .set({ updatedAt: new Date() })
    .where(eq(dashboards.id, data.dashboardId));

  return widget.id;
}

export async function updateDashboardWidgetModel(data: {
  id: string;
  dashboardId: string;
  workspaceId: string;
  projectId: string;
  title?: string | null;
  config?: DashboardWidgetConfig;
  layout?: DashboardWidgetLayout;
}): Promise<boolean> {
  const dashboard = await getDashboardDefinition(
    data.dashboardId,
    data.workspaceId,
    data.projectId
  );

  if (!dashboard) return false;

  const updated = await db
    .update(dashboardWidgets)
    .set({
      ...(data.title === undefined ? {} : { title: data.title }),
      ...(data.config === undefined
        ? {}
        : { config: data.config, type: data.config.type }),
      ...(data.layout === undefined ? {} : { layout: data.layout }),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(dashboardWidgets.id, data.id),
        eq(dashboardWidgets.dashboardId, data.dashboardId)
      )
    )
    .returning({ id: dashboardWidgets.id });

  if (updated.length > 0) {
    await db
      .update(dashboards)
      .set({ updatedAt: new Date() })
      .where(eq(dashboards.id, data.dashboardId));
  }

  return updated.length > 0;
}

export async function deleteDashboardWidgetModel(data: {
  id: string;
  dashboardId: string;
  workspaceId: string;
  projectId: string;
}): Promise<boolean> {
  const dashboard = await getDashboardDefinition(
    data.dashboardId,
    data.workspaceId,
    data.projectId
  );

  if (!dashboard) return false;

  const deleted = await db
    .delete(dashboardWidgets)
    .where(
      and(
        eq(dashboardWidgets.id, data.id),
        eq(dashboardWidgets.dashboardId, data.dashboardId)
      )
    )
    .returning({ id: dashboardWidgets.id });

  if (deleted.length > 0) {
    await db
      .update(dashboards)
      .set({ updatedAt: new Date() })
      .where(eq(dashboards.id, data.dashboardId));
  }

  return deleted.length > 0;
}
