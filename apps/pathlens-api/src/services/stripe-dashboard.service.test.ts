import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePath = (relativePath: string) =>
  pathToFileURL(join(process.cwd(), "src", relativePath)).href;

mock.module(sourcePath("db/client.ts"), {
  namedExports: {
    db: {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: async () => [
                  {
                    accountId: "acct_test",
                    connectionStatus: "connected",
                    catalogStatus: "available",
                    catalogVisible: true,
                  },
                ],
              }),
            }),
          }),
        }),
      }),
    },
  },
});

mock.module(sourcePath("lib/stripe.ts"), {
  namedExports: {
    stripe: {
      charges: {
        list: async () => ({
          data: [
            {
              id: "ch_1",
              status: "succeeded",
              paid: true,
              currency: "usd",
              amount: 1000,
              amount_refunded: 100,
              created: 1_700_000_000,
            },
            {
              id: "ch_2",
              status: "succeeded",
              paid: true,
              currency: "eur",
              amount: 500,
              amount_refunded: 0,
              created: 1_700_000_100,
            },
          ],
          has_more: false,
        }),
      },
      paymentIntents: {
        list: async () => ({
          data: [
            {
              id: "pi_1",
              status: "requires_payment_method",
              last_payment_error: {},
            },
          ],
          has_more: false,
        }),
      },
      subscriptions: {
        list: async () => ({
          data: [
            { id: "sub_1", status: "active" },
            { id: "sub_2", status: "canceled" },
          ],
          has_more: false,
        }),
      },
    },
  },
});

let getStripeDashboardData: (typeof import("./stripe-dashboard.service"))["getStripeDashboardData"];

async function getService() {
  if (!getStripeDashboardData) {
    ({ getStripeDashboardData } = await import("./stripe-dashboard.service"));
  }
  return getStripeDashboardData;
}

test("keeps Stripe currencies separate and accounts for refunds", async () => {
  const result = await (
    await getService()
  )({
    workspaceId: "workspace-id",
    projectId: "project-id",
    days: 30,
  });

  assert.deepEqual(result.revenue.gross, { usd: 1000, eur: 500 });
  assert.deepEqual(result.revenue.refunds, { usd: 100 });
  assert.deepEqual(result.revenue.netAfterRefunds, { usd: 900, eur: 500 });
  assert.equal(result.payments.failedPaymentIntents, 1);
  assert.equal(result.subscriptions.active, 1);
  assert.equal(result.subscriptions.canceled, 1);
});
