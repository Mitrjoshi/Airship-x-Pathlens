# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Install and run root scripts from the repository root; use `pnpm --filter <package> <script>` for focused work.
- Pathlens and Airship are separate products. Shared browser-safe contracts are in `packages/contracts`; shared shadcn UI is in `packages/ui`; `packages/backend-types` is server-only. Keep product-specific code in its owning app.
- Add shared UI with `pnpm --filter @workspace/ui exec shadcn add <component>` and import it from `@workspace/ui/components/*`. For Airship UI, read `apps/airship-web/AGENTS.md` too.

## Commands

- `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; `pnpm format:check` checks formatting. There is no root test script.
- Focused tests: `pnpm --filter @pathlens/api test:geoip`, `pnpm --filter @pathlens/api test:heatmaps`, `pnpm --filter @pathlens/api test:preview-sessions`, or `pnpm --filter @pathlens/api test:authorization`; `pnpm --filter @pathlens/snapshot-worker test`; and `pnpm --filter @pathlens/heatmap-proxy test`, `pnpm --filter @pathlens/heatmap-proxy test:browser`, `pnpm --filter @pathlens/heatmap-proxy test:browser:js`, or `pnpm --filter @pathlens/heatmap-proxy test:framework`. The framework test builds `@pathlens/heatmap-proxy-fixtures` first.
- Build the tracker with `pnpm --filter @pathlens/tracker build`; its output is `apps/pathlens-tracker/dist/tracker.global.js`.

## Boundaries

- Copy the relevant `.env.example` to a package-local `.env` for Pathlens web, API, tracker, and snapshot worker. Do not commit secrets.
- TanStack Router generates `src/routeTree.gen.ts` in both web apps. Never edit it; add routes under the owning app's `src/routes`.
- For Pathlens API schema changes, run `pnpm --filter @pathlens/api generate` before `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.
- Local defaults are Pathlens API `8080`, heatmap proxy `8082`, and Airship API `8081` (Airship can use `PORT`).

## API Contracts

- In `apps/pathlens-api/src/routes/index.ts`, events, tracking config, billing, OAuth, and internal heatmap validation must stay before `ApiKeyMiddleware`; later routes require `x-api-key` matching `INTERNAL_API_SECRET`.
- In `apps/pathlens-api/src/app.ts`, Stripe's raw-body middleware for `/api/billing/webhook` must remain before `express.json()`.
- Encrypted tracker requests require `X-Project-Key`; JWT operations require `JWT_SECRET`.

## Snapshot Worker

- Local capture needs PostgreSQL/AWS values, LocalStack on `4566`, the `pathlens-snapshot-worker-queue` SQS queue, and Chromium. Create it with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, then run `pnpm --filter @pathlens/snapshot-worker install-browser` and `pnpm --filter @pathlens/snapshot-worker local`.

## Style

- Follow package-local Prettier configs: Pathlens web uses single quotes/no semicolons; Pathlens API and tracker use double quotes/semicolons; Airship web and `packages/ui` use double quotes/no semicolons. Tailwind class sorting is enabled where configured.
