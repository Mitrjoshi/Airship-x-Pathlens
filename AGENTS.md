# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run root scripts from the repository root; use `pnpm --filter <package> <script>` for focused work.
- Pathlens and Airship are separate products. Keep product code in its owning app. `packages/contracts` contains browser-safe schemas/types, `packages/ui` contains shared shadcn primitives, and `packages/backend-types` is server-only.
- Add shared UI with `pnpm --filter @workspace/ui exec shadcn add <component>` and import it from `@workspace/ui/components/*`. Airship-specific rules are in `apps/airship-web/AGENTS.md`.

## Commands

- `pnpm verify` runs Turbo's `lint`, `typecheck`, and `build` tasks; it is not a guaranteed sequential pipeline. `pnpm format:check` checks formatting. There is no root test script.
- API tests: `pnpm --filter @pathlens/api test:geoip`, `test:heatmaps`, `test:preview-sessions`, or `test:authorization`.
- Heatmap tests: `pnpm --filter @pathlens/heatmap-proxy test`, `test:browser`, `test:browser:js`, or `test:framework`. The framework test builds `@pathlens/heatmap-proxy-fixtures` first.
- Snapshot tests use `pnpm --filter @pathlens/snapshot-worker test`; build the tracker with `pnpm --filter @pathlens/tracker build` (output: `apps/pathlens-tracker/dist/tracker.global.js`).

## Boundaries

- Copy an app's `.env.example` to that app's `.env`; never commit credentials. Local defaults are Pathlens API `8080`, heatmap proxy `8082`, and Airship API `8081`.
- TanStack Router generates `src/routeTree.gen.ts` in both web apps. Never edit it; add routes under the owning app's `src/routes`.
- For Pathlens API schema changes, run `pnpm --filter @pathlens/api generate` before `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.

## API Constraints

- In `apps/pathlens-api/src/routes/index.ts`, events, tracking config, billing, OAuth, and internal heatmap validation must remain before `ApiKeyMiddleware`; later routes require `x-api-key` matching `INTERNAL_API_SECRET`.
- In `apps/pathlens-api/src/app.ts`, Stripe's raw-body middleware for `/api/billing/webhook` must remain before `express.json()`.
- Encrypted tracker requests require `X-Project-Key`; JWT operations require `JWT_SECRET`.

## Snapshot Worker

- Local capture requires PostgreSQL/AWS values, LocalStack on `4566`, the `pathlens-snapshot-worker-queue` SQS queue, and Chromium. Create the queue with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, then run `pnpm --filter @pathlens/snapshot-worker install-browser` and `pnpm --filter @pathlens/snapshot-worker local`.

## Style

- Follow package-local Prettier configs: Pathlens web uses single quotes/no semicolons; Pathlens API and tracker use double quotes/semicolons; Airship web and `packages/ui` use double quotes/no semicolons. Tailwind class sorting is enabled where configured.
