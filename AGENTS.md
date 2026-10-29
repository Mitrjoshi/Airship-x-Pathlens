# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run installs and root scripts from the repository root; use `pnpm --filter <package> <script>` for focused work.
- Pathlens and Airship are separate products. The main boundaries are `apps/pathlens-web`, `apps/airship-web`, `apps/pathlens-api`, `apps/airship-api`, `apps/pathlens-tracker`, `apps/pathlens-snapshot-worker`, and `apps/pathlens-heatmap-proxy`. Shared browser-safe contracts are in `packages/contracts`; shared shadcn UI is in `packages/ui`; `packages/backend-types` is server-only.
- Keep product-specific UI in its app. Add shared UI with `pnpm --filter @workspace/ui exec shadcn add <component>` and import it from `@workspace/ui/components/*`. For Airship UI work, also read `apps/airship-web/AGENTS.md`.

## Commands

- `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; `pnpm format:check` validates formatting. There is no root test script.
- Pathlens API tests: `pnpm --filter @pathlens/api test:geoip`, `test:heatmaps`, `test:preview-sessions`, and `test:authorization`.
- Other focused tests: `pnpm --filter @pathlens/snapshot-worker test` and `pnpm --filter @pathlens/heatmap-proxy test`. Browser checks are `test:browser`, `test:browser:js`, or `test:framework`; `test:framework` builds `@pathlens/heatmap-proxy-fixtures` first.
- Build the tracker with `pnpm --filter @pathlens/tracker build`; the distributable IIFE is `apps/pathlens-tracker/dist/tracker.global.js`.

## Boundaries

- Copy each relevant `.env.example` to a package-local `.env`; never commit secrets. This applies to Pathlens web, API, tracker, and snapshot worker.
- TanStack Router generates `src/routeTree.gen.ts` in both web apps. Never edit it; add routes under the owning app's `src/routes`.
- For Pathlens API schema changes, run `pnpm --filter @pathlens/api generate` before `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.
- Local entrypoints/ports are Pathlens API `src/server.ts` on `8080`, heatmap proxy on config default `8082`, and Airship API on `8081` or `PORT`.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, ingestion, tracking config, billing, OAuth, and internal heatmap validation stay before `ApiKeyMiddleware`; later routes require `x-api-key` matching `INTERNAL_API_SECRET`.
- In `apps/pathlens-api/src/app.ts`, Stripe's raw-body middleware for `/api/billing/webhook` must remain before `express.json()`.
- Encrypted tracker requests require `X-Project-Key`; JWT operations require `JWT_SECRET`.

## Snapshot Worker

- Local capture needs PostgreSQL/AWS values, LocalStack on `4566`, the `pathlens-snapshot-worker-queue` SQS queue, and Chromium. Create the queue, then install Chromium and run local capture:
  `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`
  `pnpm --filter @pathlens/snapshot-worker install-browser`
  `pnpm --filter @pathlens/snapshot-worker local`

## Style

- Follow the package-local Prettier config: Pathlens web uses single quotes/no semicolons; Pathlens API and tracker use double quotes/semicolons; Airship web and `packages/ui` use double quotes/no semicolons. Tailwind class sorting is enabled.
