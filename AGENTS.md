# Repository Guide

## Workspace

- This is a pnpm 11 (`pnpm@11.22.0`) Turborepo. Run commands from the root; use `pnpm --filter <package> <script>` for focused work.
- `apps/` contains the Pathlens dashboard/API/tracker/snapshot worker and Airship frontend/API. Shared UI is in `packages/ui`, browser-safe schemas in `packages/contracts`, and server-only types in `packages/backend-types`.
- Read `apps/airship-web/AGENTS.md` before changing Airship web code. Add shared shadcn primitives to `packages/ui`, then import them as `@workspace/ui/components/*`.

## Commands

- `pnpm verify` runs Turbo `lint`, `typecheck`, and `build`; use `pnpm format:check` for formatting validation. Use `pnpm --filter <package> ...` for one package.
- The only configured test is `pnpm --filter @pathlens/api test:geoip`; there is no workspace-wide test runner.
- Build the tracker with `pnpm --filter @pathlens/tracker build`; the output is `apps/pathlens-tracker/dist/tracker.global.js`.
- For schema changes, run `pnpm --filter @pathlens/api generate` and then `pnpm --filter @pathlens/api migrate`. Never hand-edit `apps/pathlens-api/drizzle/meta/**`; use `push` only for deliberate direct synchronization.
- Snapshot local runs require `apps/pathlens-snapshot-worker/.env`, a private S3 bucket, LocalStack on port `4566`, the queue created with `aws --endpoint-url http://localhost:4566 sqs create-queue --queue-name pathlens-snapshot-worker-queue`, and one-time `pnpm --filter @pathlens/snapshot-worker install-browser`; then run `pnpm --filter @pathlens/snapshot-worker local`.

## Boundaries

- Copy the relevant `.env.example` before local development. Pathlens API `dev` and `start` explicitly load `apps/pathlens-api/.env`.
- TanStack Router generates `src/routeTree.gen.ts`; never edit it. Add routes under each app's `src/routes`.
- Pathlens API starts at `apps/pathlens-api/src/server.ts`, mounts `/api`, and listens on `8080`; Airship API starts at `apps/airship-api/src/index.ts` and exposes `/health` on `8081`.

## Runtime Contracts

- In `apps/pathlens-api/src/routes/index.ts`, keep event/replay ingestion, tracking config, billing, and OAuth routes before `ApiKeyMiddleware`; later top-level routes require `x-api-key === INTERNAL_API_SECRET`.
- Keep Stripe's raw-body middleware before `express.json()` in `apps/pathlens-api/src/app.ts`.
- Encrypted tracker requests require `X-Project-Key`; middleware validates the key, origin, and scopes before injecting the project ID. JWT operations require `JWT_SECRET`.
- Preserve Pathlens web's `VITE_API_BASE_URL`, `VITE_API_KEY`, `VITE_TRACKER_SCRIPT_URL`, and `pathlens-token` localStorage key.

## Style

- Root Prettier uses single quotes, no semicolons, and Tailwind class sorting. Airship web and `packages/ui` use double quotes/no semicolons; Pathlens API and tracker use double quotes/semicolons.
- Web apps, snapshot worker, and shared UI enforce unused locals/parameters and `erasableSyntaxOnly`; avoid TypeScript syntax requiring runtime emission.
