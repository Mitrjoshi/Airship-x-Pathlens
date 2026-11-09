# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run installs and root scripts from the repository root; use `pnpm --filter <package> <script>` for focused work.
- Pathlens and Airship are separate products. Keep product code in its owning app. `packages/contracts` is browser-safe, `packages/backend-types` is server-only, and `packages/ui` owns shared shadcn components.
- Before changing Airship web, read `apps/airship-web/AGENTS.md`. Add shared UI with `pnpm --filter @workspace/ui exec shadcn add <component>` and import it from `@workspace/ui/components/*`.

## Commands

- `pnpm dev`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` run Turbo tasks. `pnpm verify` runs lint, typecheck, and build, but not tests; use `pnpm format` or `pnpm format:check` separately.
- There is no root test script. API tests are `pnpm --filter @pathlens/api test:geoip`, `test:pagespeed`, `test:search-console`, `test:heatmaps`, `test:preview-sessions`, and `test:authorization`.
- Heatmap proxy tests are `pnpm --filter @pathlens/heatmap-proxy test`, `test:browser`, `test:browser:js`, and `test:framework`; `test:framework` builds `@pathlens/heatmap-proxy-fixtures` first. Snapshot worker tests use `pnpm --filter @pathlens/snapshot-worker test`.
- Build the tracker with `pnpm --filter @pathlens/tracker build`; its browser artifact is `apps/pathlens-tracker/dist/tracker.global.js`.

## Setup And Boundaries

- Copy each app's `.env.example` to `.env`; do not commit credentials. Product-specific code stays in its app, while shared contracts/types/UI stay in the corresponding `packages/*` package.
- Snapshot capture needs PostgreSQL/AWS values, a private S3 bucket, LocalStack on `4566` with the `pathlens-snapshot-worker-queue` queue, and Chromium. Create the queue with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, install Chromium with `pnpm --filter @pathlens/snapshot-worker install-browser`, then run `pnpm --filter @pathlens/snapshot-worker local`.
- TanStack Router generates each web app's `src/routeTree.gen.ts`; never edit it. Add routes under that app's `src/routes`.
- For API schema changes, run `pnpm --filter @pathlens/api generate` before `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.

## API Constraints

- In `apps/pathlens-api/src/routes/index.ts`, ingestion, tracking config, billing, OAuth/Slack callbacks, and internal heatmap validation must remain before `ApiKeyMiddleware`; later routes require `x-api-key` matching `INTERNAL_API_SECRET`.
- Keep `/api/billing/webhook`'s `express.raw()` middleware before `express.json()` in `apps/pathlens-api/src/app.ts` for Stripe signature verification.
- Encrypted tracker requests require `X-Project-Key`; JWT operations require `JWT_SECRET`.

## Style

- Root Prettier uses single quotes, no semicolons, and Tailwind class sorting. Preserve local overrides: Pathlens API/tracker use double quotes and semicolons; Airship web and `packages/ui` use double quotes and no semicolons.
