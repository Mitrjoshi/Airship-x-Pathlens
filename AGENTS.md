# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run installs and root scripts from the repository root; use `pnpm --filter <package> <script>` for focused work.
- Pathlens and Airship are separate products. Keep product code in its owning app. `packages/contracts` contains browser-safe schemas/types, `packages/ui` contains shared shadcn UI, and `packages/backend-types` is server-only.
- Add shared UI with `pnpm --filter @workspace/ui exec shadcn add <component>` and import it from `@workspace/ui/components/*`. Read `apps/airship-web/AGENTS.md` before changing Airship web.

## Commands

- `pnpm dev`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` run Turbo tasks. `pnpm verify` runs lint, typecheck, and build; it does not run tests. Use `pnpm format` or `pnpm format:check` separately.
- There is no root test script.
- Focused tests: `pnpm --filter @pathlens/api test:geoip`, `test:heatmaps`, `test:preview-sessions`, or `test:authorization`; `pnpm --filter @pathlens/heatmap-proxy test`; and `pnpm --filter @pathlens/snapshot-worker test`.
- Heatmap browser tests are `pnpm --filter @pathlens/heatmap-proxy test:browser`, `test:browser:js`, and `test:framework`. The framework test builds `@pathlens/heatmap-proxy-fixtures` first. Build the tracker with `pnpm --filter @pathlens/tracker build`; its browser bundle is `apps/pathlens-tracker/dist/tracker.global.js`.

## Boundaries

- Copy the relevant app `.env.example` to that app's `.env` and fill in local values; `.env` and credentials are ignored and must not be committed. Pathlens local defaults include API `8080`, heatmap proxy `8082`, frontend `5173`, and LocalStack `4566`.
- Snapshot capture additionally needs PostgreSQL/AWS values, a private S3 bucket, LocalStack on port `4566` with the `pathlens-snapshot-worker-queue` queue, and Chromium. Create the queue with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, then run `pnpm --filter @pathlens/snapshot-worker install-browser` and `pnpm --filter @pathlens/snapshot-worker local`; see `apps/pathlens-snapshot-worker/README.md`.
- TanStack Router generates `src/routeTree.gen.ts` through each web app's Vite plugin. Never edit that file; add routes under the owning app's `src/routes`.
- For Pathlens API schema changes, run `pnpm --filter @pathlens/api generate` before `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.

## API Constraints

- Preserve `apps/pathlens-api/src/routes/index.ts` ordering: ingestion, tracking config, billing, OAuth/Slack callbacks, and internal heatmap validation precede `ApiKeyMiddleware`; routes after it require `x-api-key` matching `INTERNAL_API_SECRET`.
- Keep the raw-body middleware for `/api/billing/webhook` in `apps/pathlens-api/src/app.ts` before `express.json()` so Stripe signature verification works.
- Encrypted tracker requests require `X-Project-Key`; JWT operations require `JWT_SECRET`.

## Style

- The root formatter uses single quotes, no semicolons, and Tailwind class sorting. Preserve local overrides: Pathlens API/tracker use double quotes and semicolons; Airship web and `packages/ui` use double quotes and no semicolons.
