import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = (relativePath: string) =>
  pathToFileURL(join(process.cwd(), "src", relativePath)).href;

mock.module(sourcePath("services/stripe-dashboard.service.ts"), {
  namedExports: {
    StripeDashboardError: class StripeDashboardError extends Error {
      statusCode = 429;
    },
    getStripeDashboardData: async () => ({
      provider: "stripe",
      period: {
        start: "2026-02-01T00:00:00.000Z",
        end: "2026-03-01T00:00:00.000Z",
        days: 30,
      },
      fetchedAt: "2026-03-01T00:00:00.000Z",
      account: { id: "acct_test" },
      revenue: {
        gross: { usd: 1000, eur: 500 },
        refunds: { usd: 100 },
        netAfterRefunds: { usd: 900, eur: 500 },
        unit: "minor",
        feesIncluded: false,
      },
      payments: {
        successfulCharges: 2,
        failedPaymentIntents: 1,
        totalPaymentIntents: 3,
      },
      subscriptions: {
        active: 1,
        trialing: 0,
        canceled: 0,
        total: 1,
        snapshot: true,
      },
      revenueByDay: [],
    }),
  },
});

let getStripeDashboard: (typeof import("./stripe-dashboard.controller"))["getStripeDashboard"];

async function getController() {
  if (!getStripeDashboard) {
    ({ getStripeDashboard } = await import("./stripe-dashboard.controller"));
  }
  return getStripeDashboard;
}

test("returns the Stripe dashboard envelope", async () => {
  let body: unknown;
  const response = {
    status: () => response,
    json: (value: unknown) => {
      body = value;
      return response;
    },
  };

  await (
    await getController()
  )(
    {
      params: { project_id: "00000000-0000-4000-8000-000000000001" },
      query: {
        workspace_id: "00000000-0000-4000-8000-000000000002",
        range: "30d",
      },
    } as never,
    response as never
  );

  assert.equal((body as { success: boolean }).success, true);
  assert.deepEqual(
    (body as { data: { revenue: { gross: Record<string, number> } } }).data
      .revenue.gross,
    { usd: 1000, eur: 500 }
  );
});

test("rejects invalid Stripe dashboard parameters", async () => {
  let statusCode: number | undefined;
  const response = {
    status: (status: number) => {
      statusCode = status;
      return response;
    },
    json: () => response,
  };

  await (
    await getController()
  )(
    {
      params: { project_id: "bad" },
      query: {},
    } as never,
    response as never
  );

  assert.equal(statusCode, 400);
});
