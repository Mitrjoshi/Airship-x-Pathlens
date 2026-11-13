import { and, eq } from "drizzle-orm";
import type { StripeDashboardData } from "@workspace/contracts";

import { db } from "../db/client";
import { integrations, projectIntegrations, projects } from "../db/schema";
import { stripe } from "../lib/stripe";

const MAX_RECORDS = 5000;

type Money = Record<string, number>;

function addMoney(target: Money, currency: string, amount: number) {
  const key = currency.toLowerCase();
  target[key] = (target[key] ?? 0) + amount;
}

async function collectAll<T extends { id: string }>(
  fetchPage: (startingAfter?: string) => Promise<{
    data: T[];
    has_more: boolean;
  }>
) {
  const results: T[] = [];
  let startingAfter: string | undefined;

  while (true) {
    const page = await fetchPage(startingAfter);
    results.push(...page.data);

    if (results.length > MAX_RECORDS) {
      throw new StripeDashboardError(
        "Stripe analytics exceeded the safe historical limit.",
        502
      );
    }
    if (!page.has_more) return results;

    const lastItem = page.data[page.data.length - 1];
    if (!lastItem) {
      throw new StripeDashboardError(
        "Stripe returned an invalid pagination response.",
        502
      );
    }
    startingAfter = lastItem.id;
  }
}

export class StripeDashboardError extends Error {
  constructor(
    message: string,
    public readonly statusCode: 404 | 429 | 502 | 504
  ) {
    super(message);
    this.name = "StripeDashboardError";
  }
}

export async function getStripeDashboardData(input: {
  workspaceId: string;
  projectId: string;
  days: number;
}): Promise<StripeDashboardData> {
  // Keep provider data fresh without adding shared server cache state. Every
  // request is bounded by Stripe's client timeout and MAX_RECORDS.
  const [connection] = await db
    .select({
      accountId: projectIntegrations.providerWorkspaceId,
      connectionStatus: projectIntegrations.status,
      catalogStatus: integrations.status,
      catalogVisible: integrations.isVisible,
    })
    .from(projectIntegrations)
    .innerJoin(projects, eq(projects.id, projectIntegrations.projectId))
    .innerJoin(
      integrations,
      eq(integrations.id, projectIntegrations.integrationId)
    )
    .where(
      and(
        eq(projects.id, input.projectId),
        eq(projects.workspaceId, input.workspaceId),
        eq(integrations.slug, "stripe")
      )
    )
    .limit(1);

  if (
    !connection ||
    !connection.accountId ||
    connection.connectionStatus !== "connected" ||
    connection.catalogStatus !== "available" ||
    !connection.catalogVisible
  ) {
    throw new StripeDashboardError(
      "Stripe is not connected to this project.",
      404
    );
  }

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - input.days * 86400000);
  const created = {
    gte: Math.floor(startDate.getTime() / 1000),
    lt: Math.floor(endDate.getTime() / 1000),
  };
  const requestOptions = { stripeAccount: connection.accountId };

  try {
    const [charges, paymentIntents, subscriptions] = await Promise.all([
      collectAll((startingAfter) =>
        stripe.charges.list(
          {
            limit: 100,
            created,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          },
          requestOptions
        )
      ),
      collectAll((startingAfter) =>
        stripe.paymentIntents.list(
          {
            limit: 100,
            created,
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          },
          requestOptions
        )
      ),
      collectAll((startingAfter) =>
        stripe.subscriptions.list(
          {
            limit: 100,
            status: "all",
            ...(startingAfter ? { starting_after: startingAfter } : {}),
          },
          requestOptions
        )
      ),
    ]);

    const successfulCharges = charges.filter(
      (charge) => charge.status === "succeeded" && charge.paid
    );
    const gross: Money = {};
    const refunds: Money = {};
    const netAfterRefunds: Money = {};

    for (const charge of successfulCharges) {
      addMoney(gross, charge.currency, charge.amount);
      if (charge.amount_refunded > 0) {
        addMoney(refunds, charge.currency, charge.amount_refunded);
      }
    }
    for (const currency of new Set([
      ...Object.keys(gross),
      ...Object.keys(refunds),
    ])) {
      netAfterRefunds[currency] =
        (gross[currency] ?? 0) - (refunds[currency] ?? 0);
    }

    const revenueByDay = new Map<string, { gross: Money; refunds: Money }>();
    for (const charge of successfulCharges) {
      const date = new Date(charge.created * 1000).toISOString().slice(0, 10);
      const entry = revenueByDay.get(date) ?? { gross: {}, refunds: {} };
      addMoney(entry.gross, charge.currency, charge.amount);
      if (charge.amount_refunded > 0) {
        addMoney(entry.refunds, charge.currency, charge.amount_refunded);
      }
      revenueByDay.set(date, entry);
    }

    return {
      provider: "stripe",
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        days: input.days,
      },
      fetchedAt: new Date().toISOString(),
      account: { id: connection.accountId },
      revenue: {
        gross,
        refunds,
        netAfterRefunds,
        unit: "minor",
        feesIncluded: false,
      },
      payments: {
        successfulCharges: successfulCharges.length,
        failedPaymentIntents: paymentIntents.filter(
          (payment) =>
            payment.status === "requires_payment_method" &&
            payment.last_payment_error !== null
        ).length,
        totalPaymentIntents: paymentIntents.length,
      },
      subscriptions: {
        active: subscriptions.filter((item) => item.status === "active").length,
        trialing: subscriptions.filter((item) => item.status === "trialing")
          .length,
        canceled: subscriptions.filter((item) => item.status === "canceled")
          .length,
        total: subscriptions.length,
        snapshot: true,
      },
      revenueByDay: [...revenueByDay.entries()]
        .map(([date, values]) => ({ date, ...values }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  } catch (error) {
    if (error instanceof StripeDashboardError) throw error;
    const status = (error as { statusCode?: number }).statusCode;
    if (status === 429 || (error as { code?: string }).code === "rate_limit") {
      throw new StripeDashboardError(
        "Stripe is rate limiting analytics requests. Please try again shortly.",
        429
      );
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new StripeDashboardError(
        "Stripe analytics took too long to respond.",
        504
      );
    }
    const code = (error as { code?: string }).code;
    if (["ETIMEDOUT", "ESOCKETTIMEDOUT", "timeout"].includes(code ?? "")) {
      throw new StripeDashboardError(
        "Stripe analytics took too long to respond.",
        504
      );
    }
    throw new StripeDashboardError("Unable to retrieve Stripe analytics.", 502);
  }
}
