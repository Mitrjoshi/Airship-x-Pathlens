export type GoalType =
  "event" | "revenue" | "pageview" | "button" | "form_submit";

export interface GoalMatchDefinition {
  type: GoalType;
  matchTarget: string;
  matchPath: string | null;
}

export interface GoalEventRow extends Record<string, unknown> {
  occurred_at: Date | string | null;
  path: string | null;
  type: string;
  payload: Record<string, unknown> | null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;

  if (typeof value === "string") {
    const number = Number(value);

    return Number.isFinite(number) ? number : 0;
  }

  return 0;
}

function normalizeButtonText(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export function matchesGoal(
  event: GoalEventRow,
  goal: GoalMatchDefinition
): boolean {
  const target = goal.matchTarget.trim();

  if (goal.type === "pageview") {
    return event.type === "page_view" && (event.path?.trim() || "/") === target;
  }

  if (goal.type === "button") {
    return (
      event.type === "click" &&
      (event.path?.trim() || "/") === (goal.matchPath?.trim() || "/") &&
      normalizeButtonText(event.payload?.buttonText) ===
        normalizeButtonText(target)
    );
  }

  if (goal.type === "form_submit") {
    return (
      event.type === "form_submit" &&
      typeof event.payload?.id === "string" &&
      event.payload.id.trim() === target
    );
  }

  if (target.startsWith("/")) {
    return (event.path?.trim() || "/") === target;
  }

  return event.type.toLowerCase() === target.toLowerCase();
}

export function getRevenueValue(
  payload: Record<string, unknown> | null
): number {
  if (!payload) return 0;

  const cents = payload.revenue_cents ?? payload.amount_cents;

  if (cents !== undefined) return toNumber(cents) / 100;

  return toNumber(payload.revenue ?? payload.value ?? payload.amount);
}
