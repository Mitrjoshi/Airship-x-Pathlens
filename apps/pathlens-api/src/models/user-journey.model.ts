import { sql } from "drizzle-orm";
import type {
  UserJourneyData,
  UserJourneyDevice,
  UserJourneyEdgeSegment,
  UserJourneyNode,
  UserJourneyNodeType,
  UserJourneyRange,
} from "@workspace/contracts/user-journey";
import { db } from "../db/client";

export type { UserJourneyDevice, UserJourneyRange } from "@workspace/contracts/user-journey";

export interface UserJourneyFilters {
  workspaceId: string;
  projectId: string;
  range: UserJourneyRange;
  device: UserJourneyDevice;
}

interface JourneyEventRow extends Record<string, unknown> {
  event_id: string;
  visitor_id: string;
  session_id: string;
  type: string;
  path: string | null;
  title: string | null;
  payload: Record<string, unknown> | null;
  occurred_at: Date | string | null;
}

interface JourneyStep {
  key: string;
  title: string;
  subtitle: string;
  type: Exclude<UserJourneyNodeType, "entry" | "dropoff">;
  timestamp: number;
  isConversion: boolean;
  description: string;
}

interface SessionPath {
  visitorId: string;
  steps: JourneyStep[];
}

interface NodeAggregate {
  key: string;
  title: string;
  subtitle: string;
  type: UserJourneyNodeType;
  description: string;
  visitors: Set<string>;
  elapsedMs: number;
  elapsedSamples: number;
}

interface EdgeAggregate {
  id: string;
  from: string;
  to: string;
  segment: UserJourneyEdgeSegment;
  visitors: Set<string>;
  conversionVisitors: Set<string>;
  dropoffVisitors: Set<string>;
}

const RANGE_DAYS: Record<UserJourneyRange, number> = {
  "24h": 1,
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const ENTRY_NODE_ID = "entry";
const DROPOFF_NODE_ID = "dropoff";
const MAX_NODES = 16;
const MAX_EDGES = 32;

function toTimestamp(value: unknown): number | null {
  const timestamp = value instanceof Date ? value.getTime() : new Date(String(value)).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatPathTitle(path: string, documentTitle: string | null): string {
  const title = documentTitle?.trim();

  if (title) return title.slice(0, 80);
  if (path === "/") return "Home page";

  const segment = path.split("/").filter(Boolean).pop() ?? path;

  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .slice(0, 80);
}

function normalizePath(path: string | null): string {
  const value = path?.trim() || "/";
  const normalized = value.startsWith("/") ? value : `/${value}`;

  return normalized.split(/[?#]/, 1)[0] || "/";
}

function getPayloadString(
  payload: Record<string, unknown> | null,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = payload?.[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim().replace(/\s+/g, " ").slice(0, 80);
    }
  }

  return null;
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "unknown"
  );
}

function isConversionLabel(value: string): boolean {
  return /sign\s*up|register|checkout|purchase|complete|success|convert|trial|subscribe|upgrade/i.test(
    value
  );
}

function getEventStep(event: JourneyEventRow, timestamp: number): JourneyStep | null {
  const type = event.type.toLowerCase();

  if (type === "page_view") {
    const path = normalizePath(event.path);

    return {
      key: `page:${path}`,
      title: formatPathTitle(path, event.title),
      subtitle: path,
      type: "page",
      timestamp,
      isConversion: false,
      description: `Visitors who viewed ${path} during this journey.`,
    };
  }

  if (type === "form_submit" || type === "form_success" || type === "form_error") {
    const formId = getPayloadString(event.payload, ["id", "name"]);
    const successful = type === "form_success" || type === "form_submit";
    const title = formId
      ? `${successful ? "Form submitted" : "Form failed"}: ${formId}`
      : successful
        ? "Form submitted"
        : "Form failed";

    return {
      key: `event:${type}:${slug(formId ?? type)}`,
      title,
      subtitle: type,
      type: successful ? "conversion" : "action",
      timestamp,
      isConversion: successful,
      description: successful
        ? "Visitors who reached a form submission in this journey."
        : "Visitors who encountered a form error in this journey.",
    };
  }

  if (type === "custom") {
    const label =
      getPayloadString(event.payload, [
        "name",
        "eventName",
        "event",
        "label",
        "buttonText",
        "text",
      ]) ?? "Custom event";

    return {
      key: `event:custom:${slug(label)}`,
      title: label,
      subtitle: "custom",
      type: "conversion",
      timestamp,
      isConversion: true,
      description: "Visitors who reached this custom conversion event.",
    };
  }

  if (type === "click") {
    const label = getPayloadString(event.payload, ["buttonText", "text"]);

    if (!label) return null;

    const conversion = isConversionLabel(label);

    return {
      key: `click:${slug(label)}`,
      title: label,
      subtitle: "click",
      type: conversion ? "conversion" : "action",
      timestamp,
      isConversion: conversion,
      description: conversion
        ? "Visitors who clicked a conversion-oriented call to action."
        : "Visitors who clicked this element during the journey.",
    };
  }

  return null;
}

function createNodeAggregate(
  key: string,
  title: string,
  subtitle: string,
  type: UserJourneyNodeType,
  description: string
): NodeAggregate {
  return {
    key,
    title,
    subtitle,
    type,
    description,
    visitors: new Set<string>(),
    elapsedMs: 0,
    elapsedSamples: 0,
  };
}

function addNodeVisit(
  nodes: Map<string, NodeAggregate>,
  step: {
    key: string;
    title: string;
    subtitle: string;
    type: UserJourneyNodeType;
    description: string;
  },
  visitorId: string,
  elapsedMs: number
) {
  const node =
    nodes.get(step.key) ??
    createNodeAggregate(
      step.key,
      step.title,
      step.subtitle,
      step.type,
      step.description
    );

  if (!node.visitors.has(visitorId)) {
    node.visitors.add(visitorId);
    node.elapsedMs += Math.max(0, elapsedMs);
    node.elapsedSamples += 1;
  }

  nodes.set(step.key, node);
}

function addEdgeVisit(
  edges: Map<string, EdgeAggregate>,
  from: string,
  to: string,
  outcome: "conversion" | "dropoff",
  visitorId: string
) {
  const id = `${from}->${to}`;
  const edge = edges.get(id) ?? {
    id,
    from,
    to,
    segment: "shared",
    visitors: new Set<string>(),
    conversionVisitors: new Set<string>(),
    dropoffVisitors: new Set<string>(),
  };

  edge.visitors.add(visitorId);
  if (outcome === "conversion") edge.conversionVisitors.add(visitorId);
  if (outcome === "dropoff") edge.dropoffVisitors.add(visitorId);
  edges.set(id, edge);
}

function getEdgeSegment(edge: EdgeAggregate): UserJourneyEdgeSegment {
  if (edge.conversionVisitors.size > 0 && edge.dropoffVisitors.size > 0) {
    return "shared";
  }

  if (edge.conversionVisitors.size > 0) return "conversion";
  return "dropoff";
}

function getNodePriority(type: UserJourneyNodeType): number {
  if (type === "conversion") return 0;
  if (type === "dropoff") return 1;
  if (type === "page") return 2;
  return 3;
}

function getNodeDepths(
  nodes: NodeAggregate[],
  edges: EdgeAggregate[]
): Map<string, number> {
  const depths = new Map<string, number>([[ENTRY_NODE_ID, 0]]);
  const queue = [ENTRY_NODE_ID];
  const outgoing = new Map<string, EdgeAggregate[]>();

  for (const edge of edges) {
    const current = outgoing.get(edge.from) ?? [];
    current.push(edge);
    outgoing.set(edge.from, current);
  }

  while (queue.length > 0) {
    const from = queue.shift();
    if (!from) continue;

    for (const edge of outgoing.get(from) ?? []) {
      if (depths.has(edge.to)) continue;

      depths.set(edge.to, (depths.get(from) ?? 0) + 1);
      queue.push(edge.to);
    }
  }

  for (const node of nodes) {
    if (!depths.has(node.key)) depths.set(node.key, 1);
  }

  return depths;
}

function buildNode(
  node: NodeAggregate,
  totalVisitors: number,
  depth: number
): UserJourneyNode {
  return {
    id: node.key,
    title: node.title,
    subtitle: node.subtitle,
    type: node.type,
    depth,
    visitors: node.visitors.size,
    rate:
      totalVisitors > 0
        ? Number(((node.visitors.size / totalVisitors) * 100).toFixed(1))
        : 0,
    averageTime:
      node.elapsedSamples > 0
        ? formatDuration(node.elapsedMs / node.elapsedSamples)
        : "0s",
    description: node.description,
  };
}

async function getJourneyEvents(
  filters: UserJourneyFilters
): Promise<JourneyEventRow[]> {
  const rangeDays = RANGE_DAYS[filters.range];
  const deviceFilter =
    filters.device === "all"
      ? sql``
      : sql` AND LOWER(COALESCE(device, 'unknown')) = ${filters.device}`;
  const result = await db.execute<JourneyEventRow>(sql`
    SELECT
      id::text AS event_id,
      visitor_id,
      session_id,
      type,
      path,
      title,
      CASE
        WHEN type = 'custom' THEN payload
        ELSE jsonb_build_object(
          'id', payload->>'id',
          'name', payload->>'name',
          'eventName', payload->>'eventName',
          'event', payload->>'event',
          'label', payload->>'label',
          'buttonText', payload->>'buttonText',
          'text', payload->>'text'
        )
      END AS payload,
      occurred_at
    FROM events
    WHERE workspace_id = ${filters.workspaceId}
      AND project_id = ${filters.projectId}
      AND occurred_at >= NOW() - make_interval(days => ${rangeDays})
      AND occurred_at <= NOW()
      AND type IN (
        'page_view',
        'click',
        'form_submit',
        'form_success',
        'form_error',
        'custom'
      )
      ${deviceFilter}
    ORDER BY session_id, occurred_at ASC, id ASC;
  `);

  return result.rows;
}

export async function getUserJourneyModel(
  filters: UserJourneyFilters
): Promise<UserJourneyData> {
  const rows = await getJourneyEvents(filters);
  const sessionEvents = new Map<string, { row: JourneyEventRow; timestamp: number }[]>();

  for (const row of rows) {
    const timestamp = toTimestamp(row.occurred_at);
    if (timestamp === null) continue;

    const key = `${row.visitor_id}:${row.session_id}`;
    const events = sessionEvents.get(key) ?? [];
    events.push({ row, timestamp });
    sessionEvents.set(key, events);
  }

  const sessionPaths: SessionPath[] = [];

  for (const session of sessionEvents.values()) {
    session.sort(
      (left, right) =>
        left.timestamp - right.timestamp ||
        left.row.event_id.localeCompare(right.row.event_id)
    );

    const steps: JourneyStep[] = [];
    const seenStepKeys = new Set<string>();

    for (const item of session) {
      const step = getEventStep(item.row, item.timestamp);

      if (!step || seenStepKeys.has(step.key)) continue;

      steps.push(step);
      seenStepKeys.add(step.key);
    }

    if (steps.length > 0) {
      sessionPaths.push({
        visitorId: session[0]?.row.visitor_id ?? "",
        steps,
      });
    }
  }

  const nodes = new Map<string, NodeAggregate>();
  const edges = new Map<string, EdgeAggregate>();
  const visitors = new Set<string>();
  const convertedVisitors = new Set<string>();
  const conversionTimes = new Map<string, number>();

  nodes.set(
    ENTRY_NODE_ID,
    createNodeAggregate(
      ENTRY_NODE_ID,
      "First touch",
      "All entry points",
      "entry",
      "Visitors entering the selected journey in this period."
    )
  );

  for (const path of sessionPaths) {
    const firstStep = path.steps[0];
    if (!firstStep) continue;

    visitors.add(path.visitorId);
    const firstTimestamp = firstStep.timestamp;
    const conversionIndex = path.steps.findIndex((step) => step.isConversion);
    const converted = conversionIndex >= 0;
    const steps = converted ? path.steps.slice(0, conversionIndex + 1) : path.steps;

    if (converted) {
      const conversionStep = path.steps[conversionIndex];
      if (conversionStep && !conversionTimes.has(path.visitorId)) {
        convertedVisitors.add(path.visitorId);
        conversionTimes.set(
          path.visitorId,
          conversionStep.timestamp - firstTimestamp
        );
      }
    }

    const entry = nodes.get(ENTRY_NODE_ID);
    entry?.visitors.add(path.visitorId);
    const seenNodes = new Set<string>();
    let previousKey = ENTRY_NODE_ID;

    for (const step of steps) {
      if (!seenNodes.has(step.key)) {
        addNodeVisit(nodes, step, path.visitorId, step.timestamp - firstTimestamp);
        seenNodes.add(step.key);
      }

      addEdgeVisit(
        edges,
        previousKey,
        step.key,
        converted ? "conversion" : "dropoff",
        path.visitorId
      );
      previousKey = step.key;
    }

    if (!converted) {
      addNodeVisit(
        nodes,
        {
          key: DROPOFF_NODE_ID,
          title: "Journey exit",
          subtitle: "session_end",
          type: "dropoff",
          description: "Visitors who left before reaching a conversion signal.",
        },
        path.visitorId,
        steps[steps.length - 1]?.timestamp - firstTimestamp || 0
      );
      addEdgeVisit(edges, previousKey, DROPOFF_NODE_ID, "dropoff", path.visitorId);
    }
  }

  for (const edge of edges.values()) {
    edge.segment = getEdgeSegment(edge);
  }

  if (sessionPaths.length === 0) {
    return {
      summary: {
        visitors: 0,
        activeBranches: 0,
        conversionBranches: 0,
        dropoffBranches: 0,
        conversionRate: 0,
        avgTimeToConvert: "0s",
      },
      nodes: [],
      edges: [],
    };
  }

  const nodeCandidates = Array.from(nodes.values()).filter(
    (node) => node.key !== ENTRY_NODE_ID
  );
  nodeCandidates.sort(
    (left, right) =>
      right.visitors.size - left.visitors.size ||
      getNodePriority(left.type) - getNodePriority(right.type) ||
      left.title.localeCompare(right.title)
  );

  const selectedCandidates = nodeCandidates.slice(0, MAX_NODES - 1);
  const dropoffNode = nodeCandidates.find(
    (node) => node.type === "dropoff"
  );

  if (
    dropoffNode &&
    !selectedCandidates.some((node) => node.key === dropoffNode.key)
  ) {
    const replacementIndex = selectedCandidates.findIndex(
      (node) => node.type !== "conversion"
    );
    const index = replacementIndex >= 0 ? replacementIndex : selectedCandidates.length - 1;

    selectedCandidates[index] = dropoffNode;
  }

  const selectedNodes = [nodes.get(ENTRY_NODE_ID), ...selectedCandidates].filter(
    (node): node is NodeAggregate => Boolean(node)
  );
  const selectedNodeIds = new Set(selectedNodes.map((node) => node.key));
  const candidateEdges = Array.from(edges.values()).filter(
    (edge) => selectedNodeIds.has(edge.from) && selectedNodeIds.has(edge.to)
  );
  const candidateDepths = getNodeDepths(selectedNodes, candidateEdges);
  const selectedEdges = candidateEdges
    .filter(
      (edge) =>
        (candidateDepths.get(edge.to) ?? 1) >
        (candidateDepths.get(edge.from) ?? 0)
    )
    .sort(
      (left, right) =>
        right.visitors.size - left.visitors.size || left.id.localeCompare(right.id)
    )
    .slice(0, MAX_EDGES);
  const depths = getNodeDepths(selectedNodes, selectedEdges);
  const selectedNodeData = selectedNodes
    .map((node) => buildNode(node, visitors.size, depths.get(node.key) ?? 1))
    .sort((left, right) => left.depth - right.depth || right.visitors - left.visitors);
  const nodeVisitorCounts = new Map(
    selectedNodes.map((node) => [node.key, node.visitors.size])
  );
  const selectedEdgeData = selectedEdges.map((edge) => {
    const fromVisitors = nodeVisitorCounts.get(edge.from) ?? 0;

    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      visitors: edge.visitors.size,
      rate:
        fromVisitors > 0
          ? Number(((edge.visitors.size / fromVisitors) * 100).toFixed(1))
          : 0,
      segment: edge.segment,
    };
  });
  const averageConversionTime =
    conversionTimes.size > 0
      ? Array.from(conversionTimes.values()).reduce(
          (total, value) => total + value,
          0
        ) / conversionTimes.size
      : 0;
  const conversionBranches = Array.from(edges.values()).filter(
    (edge) => edge.segment === "conversion"
  ).length;
  const dropoffBranches = Array.from(edges.values()).filter(
    (edge) => edge.segment === "dropoff"
  ).length;

  return {
    summary: {
      visitors: visitors.size,
      activeBranches: conversionBranches + dropoffBranches,
      conversionBranches,
      dropoffBranches,
      conversionRate:
        visitors.size > 0
          ? Number(((convertedVisitors.size / visitors.size) * 100).toFixed(1))
          : 0,
      avgTimeToConvert: formatDuration(averageConversionTime),
    },
    nodes: selectedNodeData,
    edges: selectedEdgeData,
  };
}
