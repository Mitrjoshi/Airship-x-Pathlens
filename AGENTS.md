# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run `pnpm install` and root scripts from the repository root; use `pnpm --filter <package> <script>` for focused work.
- Pathlens and Airship are separate products. Keep product code in its owning app. `packages/contracts` is browser-safe shared schemas/types, `packages/ui` is shared shadcn UI, and `packages/backend-types` is server-only.
- Add shared UI with `pnpm --filter @workspace/ui exec shadcn add <component>` and import it from `@workspace/ui/components/*`. Read `apps/airship-web/AGENTS.md` for Airship-specific rules.

## Commands

- `pnpm dev`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` run Turbo tasks. `pnpm verify` runs lint, typecheck, and build through Turbo, not as a guaranteed sequential pipeline. Use `pnpm format` or `pnpm format:check` for formatting; there is no root test script.
- API tests: `pnpm --filter @pathlens/api test:geoip`, `test:heatmaps`, `test:preview-sessions`, or `test:authorization`.
- Heatmap tests: `pnpm --filter @pathlens/heatmap-proxy test`, `test:browser`, `test:browser:js`, or `test:framework`; the framework test builds `@pathlens/heatmap-proxy-fixtures` first.
- Snapshot tests use `pnpm --filter @pathlens/snapshot-worker test`. Build the tracker with `pnpm --filter @pathlens/tracker build`; its browser bundle is `apps/pathlens-tracker/dist/tracker.global.js`.

## Boundaries

- Copy the relevant app `.env.example` to that app's `.env` and fill in local values; `.env` and credentials are ignored and must not be committed. Pathlens local defaults include API `8080`, heatmap proxy `8082`, frontend `5173`, and LocalStack `4566`.
- TanStack Router generates `src/routeTree.gen.ts` through each web app's Vite plugin. Never edit that file; add routes under the owning app's `src/routes`.
- For Pathlens API schema changes, run `pnpm --filter @pathlens/api generate` before `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct database synchronization.

## API Constraints

- Preserve the route order in `apps/pathlens-api/src/routes/index.ts`: `/events`, `/replay`, tracking config, billing, OAuth/Slack callbacks, and internal heatmap validation are registered before `ApiKeyMiddleware`; routes after it require `x-api-key` matching `INTERNAL_API_SECRET`.
- In `apps/pathlens-api/src/app.ts`, Stripe's raw-body middleware for `/api/billing/webhook` must remain before `express.json()`.
- Encrypted tracker requests require `X-Project-Key`; JWT operations require `JWT_SECRET`.

## Snapshot Worker

- Local capture needs PostgreSQL/AWS values, a private S3 bucket, LocalStack on `4566`, the `pathlens-snapshot-worker-queue` SQS queue, and Chromium. Create the queue with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, then run `pnpm --filter @pathlens/snapshot-worker install-browser` and `pnpm --filter @pathlens/snapshot-worker local`.

## Style

- The root formatter uses single quotes and no semicolons with Tailwind class sorting. Preserve package conventions where they differ: Pathlens API/tracker use double quotes and semicolons; Airship web and `packages/ui` use double quotes and no semicolons.
