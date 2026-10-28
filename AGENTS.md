# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the repository root; use `pnpm --filter <package> <script>` for focused work.
- `apps/pathlens-web` and `apps/airship-web` are Vite/TanStack Router frontends. `apps/pathlens-api` is the Pathlens Express/PostgreSQL API, `apps/airship-api` is a separate Express service, and the tracker, snapshot worker, and heatmap proxy are independent services.
- `packages/ui` owns shared shadcn primitives, `packages/contracts` owns browser-safe schemas/types, and `packages/backend-types` is server-only. Keep product-specific UI in its app. For Airship UI work, also read `apps/airship-web/AGENTS.md`.
- Add shared UI with `pnpm --filter @workspace/ui exec shadcn add <component>` and import it from `@workspace/ui/components/*`.

## Commands

- `pnpm install` must run at the repository root. `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; use `pnpm format:check` for formatting validation.
- There is no root test script. Focused tests are `pnpm --filter @pathlens/api test:geoip`, `test:heatmaps`, `test:preview-sessions`, `test:authorization`, `pnpm --filter @pathlens/snapshot-worker test`, and `pnpm --filter @pathlens/heatmap-proxy test`.
- Heatmap browser checks are `pnpm --filter @pathlens/heatmap-proxy test:browser`, `test:browser:js`, or `test:framework`; the framework check builds `@pathlens/heatmap-proxy-fixtures` first.
- Build the tracker with `pnpm --filter @pathlens/tracker build`; its IIFE output is `apps/pathlens-tracker/dist/tracker.global.js`.

## Boundaries

- Services with an `.env.example` require a package-local `.env`: Pathlens web, API, tracker, and snapshot worker. Do not commit secrets.
- TanStack Router generates `src/routeTree.gen.ts` in both web apps; never edit it. Add routes under the owning app's `src/routes`.
- For API schema changes, run `pnpm --filter @pathlens/api generate` before `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.
- The Pathlens API local server is `apps/pathlens-api/src/server.ts` on port `8080`; the heatmap proxy port comes from its config and defaults to `8082`; Airship API defaults to `8081` and honors `PORT`.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, event/replay ingestion, tracking config, billing, OAuth, and internal heatmap validation must stay before `ApiKeyMiddleware`; routes after it require `x-api-key` matching `INTERNAL_API_SECRET`.
- In `apps/pathlens-api/src/app.ts`, Stripe's raw-body middleware for `/api/billing/webhook` must remain before `express.json()`.
- Encrypted tracker requests require `X-Project-Key`; JWT operations require `JWT_SECRET`.

## Snapshot Worker

- Local capture requires PostgreSQL/AWS values, LocalStack on port `4566`, the `pathlens-snapshot-worker-queue` SQS queue, and Chromium. Run `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, then `pnpm --filter @pathlens/snapshot-worker install-browser` and `pnpm --filter @pathlens/snapshot-worker local`.

## Style

- Root, Pathlens web, and most packages use Prettier single quotes/no semicolons. Pathlens API and tracker use double quotes/semicolons; Airship web and `packages/ui` use double quotes/no semicolons. Tailwind class sorting is enabled.
